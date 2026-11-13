import { NavLink } from 'react-router-dom';
import { cartCount, useCart } from '../store/cart.js';
import { useChat } from '../store/chat.js';
import { IconBag, IconChat, IconGrid, IconHome, IconTag } from './Icons.jsx';

const items = [
  { to: '/', label: 'Home', icon: IconHome, end: true },
  { to: '/collections', label: 'Shop', icon: IconGrid },
  { to: '/offers', label: 'Offers', icon: IconTag },
  { to: '/cart', label: 'Bag', icon: IconBag },
];

export default function MobileNav() {
  const { items: cartItems } = useCart();
  const { openChat } = useChat();
  const count = cartCount(cartItems);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-navy/10 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium tracking-wide ${
                isActive ? 'text-navy' : 'text-ink/45'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} strokeWidth={isActive ? 2 : 1.6} />
                <span>{item.label}</span>
                {item.label === 'Bag' && count > 0 && (
                  <span className="absolute right-[26%] top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-navy">
                    {count}
                  </span>
                )}
                {isActive && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-gold" />}
              </>
            )}
          </NavLink>
        ))}
        <button type="button" onClick={openChat} className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium tracking-wide text-ink/45">
          <IconChat size={20} />
          <span>Laheri</span>
        </button>
      </div>
    </nav>
  );
}
