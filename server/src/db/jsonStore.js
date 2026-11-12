import fs from 'node:fs';
import path from 'node:path';

const clone = (value) => JSON.parse(JSON.stringify(value));

export function getPath(doc, key) {
  if (!key) return doc;
  return key.split('.').reduce((current, part) => (current == null ? current : current[part]), doc);
}

function compare(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date || b instanceof Date) return new Date(a).getTime() - new Date(b).getTime();
  return String(a).localeCompare(String(b), 'en');
}

function equals(a, b) {
  if (a && b && typeof a === 'object' && typeof b === 'object') return JSON.stringify(a) === JSON.stringify(b);
  return a === b;
}

function matchCondition(value, condition) {
  if (condition instanceof RegExp) return typeof value === 'string' && condition.test(value);
  if (condition && typeof condition === 'object' && !Array.isArray(condition)) {
    const keys = Object.keys(condition);
    if (keys.some((key) => key.startsWith('$'))) {
      const options = condition.$options || '';
      return keys.every((operator) => {
        const arg = condition[operator];
        switch (operator) {
          case '$options':
            return true;
          case '$eq':
            return equals(value, arg);
          case '$ne':
            return !equals(value, arg);
          case '$in':
            return Array.isArray(arg) && arg.some((candidate) => equals(value, candidate));
          case '$nin':
            return Array.isArray(arg) && !arg.some((candidate) => equals(value, candidate));
          case '$gt':
            return compare(value, arg) > 0;
          case '$gte':
            return compare(value, arg) >= 0;
          case '$lt':
            return compare(value, arg) < 0;
          case '$lte':
            return compare(value, arg) <= 0;
          case '$exists':
            return arg ? value !== undefined : value === undefined;
          case '$regex': {
            try {
              return typeof value === 'string' && new RegExp(arg, options).test(value);
            } catch {
              return false;
            }
          }
          case '$all':
            return Array.isArray(value) && Array.isArray(arg) && arg.every((item) => value.includes(item));
          default:
            return false;
        }
      });
    }
    return equals(value, condition);
  }
  return equals(value, condition);
}

export function matches(doc, filter = {}) {
  if (!filter || typeof filter !== 'object') return true;
  return Object.entries(filter).every(([key, condition]) => {
    if (key === '$or') return Array.isArray(condition) && condition.some((sub) => matches(doc, sub));
    if (key === '$and') return Array.isArray(condition) && condition.every((sub) => matches(doc, sub));
    if (key === '$nor') return Array.isArray(condition) && !condition.some((sub) => matches(doc, sub));
    return matchCondition(getPath(doc, key), condition);
  });
}

function applyUpdate(doc, update = {}) {
  if (update.$set) {
    for (const [key, value] of Object.entries(update.$set)) setPath(doc, key, value);
  }
  if (update.$inc) {
    for (const [key, value] of Object.entries(update.$inc)) {
      const current = Number(getPath(doc, key) || 0);
      setPath(doc, key, current + Number(value || 0));
    }
  }
  if (update.$unset) {
    for (const key of Object.keys(update.$unset)) delete doc[key];
  }
  const plain = Object.entries(update).filter(([key]) => !key.startsWith('$'));
  for (const [key, value] of plain) setPath(doc, key, value);
  return doc;
}

function setPath(doc, key, value) {
  if (!key.includes('.')) {
    doc[key] = value;
    return;
  }
  const parts = key.split('.');
  let current = doc;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (typeof current[parts[i]] !== 'object' || current[parts[i]] === null) current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

export class JsonDb {
  constructor(file) {
    this.file = file;
    this.data = {};
    this.loaded = false;
  }

  load() {
    if (this.loaded) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    if (fs.existsSync(this.file)) {
      try {
        this.data = JSON.parse(fs.readFileSync(this.file, 'utf8')) || {};
      } catch {
        this.data = {};
      }
    }
    this.loaded = true;
  }

  persist() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
  }

  collection(name) {
    this.load();
    if (!Array.isArray(this.data[name])) this.data[name] = [];
    const rows = this.data[name];
    const store = this;

    return {
      name,
      find(filter = {}) {
        let result = rows.filter((row) => matches(row, filter));
        const cursor = {
          sort(spec = {}) {
            const entries = Object.entries(spec || {});
            if (entries.length) {
              result = [...result].sort((a, b) => {
                for (const [field, direction] of entries) {
                  const order = compare(getPath(a, field), getPath(b, field));
                  if (order !== 0) return order * direction;
                }
                return 0;
              });
            }
            return cursor;
          },
          skip(count) {
            result = result.slice(Number(count) || 0);
            return cursor;
          },
          limit(count) {
            if (count) result = result.slice(0, Number(count));
            return cursor;
          },
          async toArray() {
            return result.map(clone);
          },
        };
        return cursor;
      },
      async findOne(filter = {}) {
        const found = rows.find((row) => matches(row, filter));
        return found ? clone(found) : null;
      },
      async insertOne(doc) {
        rows.push(clone(doc));
        store.persist();
        return { insertedId: doc._id, acknowledged: true };
      },
      async insertMany(docs) {
        rows.push(...docs.map(clone));
        store.persist();
        return { insertedCount: docs.length, acknowledged: true };
      },
      async updateOne(filter, update) {
        const found = rows.find((row) => matches(row, filter));
        if (!found) return { matchedCount: 0, modifiedCount: 0 };
        applyUpdate(found, update);
        store.persist();
        return { matchedCount: 1, modifiedCount: 1 };
      },
      async deleteOne(filter) {
        const index = rows.findIndex((row) => matches(row, filter));
        if (index === -1) return { deletedCount: 0 };
        rows.splice(index, 1);
        store.persist();
        return { deletedCount: 1 };
      },
      async countDocuments(filter = {}) {
        return rows.filter((row) => matches(row, filter)).length;
      },
      async distinct(field) {
        return [...new Set(rows.map((row) => getPath(row, field)).filter((value) => value != null))];
      },
    };
  }

  async replaceCollection(name, docs) {
    this.load();
    this.data[name] = docs.map(clone);
    this.persist();
  }
}
