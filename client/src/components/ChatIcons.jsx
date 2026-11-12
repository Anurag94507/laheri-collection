export { IconMic, IconSend, IconSparkles, IconVolume } from './Icons.jsx';

export const IconVolumeOff = ({ size = 20, className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M4 9h3l4-4v14l-4-4H4z" />
    <path d="m16 9 5 5M21 9l-5 5" />
  </svg>
);
