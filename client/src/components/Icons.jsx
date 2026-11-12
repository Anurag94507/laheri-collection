const Svg = ({ size = 20, strokeWidth = 1.7, children, className = '', fill = 'none', ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

const make = (render) => (props) => <Svg {...props}>{render}</Svg>;

export const IconSearch = make(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
export const IconMenu = make(<path d="M4 6h16M4 12h16M4 18h16" />);
export const IconClose = make(<path d="M6 6l12 12M18 6L6 18" />);
export const IconBag = make(<><path d="M6 8h12l-1 12H7L6 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>);
export const IconHome = make(<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" />);
export const IconGrid = make(<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>);
export const IconTag = make(<><path d="M20 13 13 20l-9-9V4h7l9 9Z" /><circle cx="8.5" cy="8.5" r="1.2" /></>);
export const IconSparkles = make(<><path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" /><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>);
export const IconStar = ({ filled = false, ...props }) => <Svg fill={filled ? 'currentColor' : 'none'} {...props}><path d="m12 3 2.7 5.6 6.3.9-4.5 4.4 1 6.1-5.5-2.9L6.5 20l1-6.1L3 9.5l6.3-.9L12 3Z" /></Svg>;
export const IconArrowRight = make(<path d="M4 12h16M13 5l7 7-7 7" />);
export const IconArrowLeft = make(<path d="M20 12H4M11 19l-7-7 7-7" />);
export const IconPlus = make(<path d="M12 5v14M5 12h14" />);
export const IconMinus = make(<path d="M5 12h14" />);
export const IconTrash = make(<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6" />);
export const IconCheck = make(<path d="m4 12 5 5L20 6" />);
export const IconTruck = make(<><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>);
export const IconPin = make(<><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></>);
export const IconPhone = make(<path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />);
export const IconMail = make(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>);
export const IconClock = make(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const IconLock = make(<><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>);
export const IconLogout = make(<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M9 12h11" />);
export const IconDownload = make(<path d="M12 4v11M8 11l4 4 4-4M4 20h16" />);
export const IconPrinter = make(<><path d="M7 8V3h10v5M7 17H4v-6h16v6h-3M7 14h10v7H7z" /></>);
export const IconSend = make(<path d="M4 12 21 4l-7 17-3-7-7-2Z" />);
export const IconMic = make(<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>);
export const IconVolume = make(<><path d="M4 9h3l4-4v14l-4-4H4z" /><path d="M16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14" /></>);
export const IconUser = make(<><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>);
export const IconFilter = make(<path d="M3 5h18l-7 8v6l-4-2v-4L3 5Z" />);
export const IconChevronDown = make(<path d="m6 9 6 6 6-6" />);
export const IconChevronLeft = make(<path d="m15 5-7 7 7 7" />);
export const IconChevronRight = make(<path d="m9 5 7 7-7 7" />);
export const IconPuzzle = make(<path d="M9 4a2 2 0 1 1 4 0v1h4v4h1a2 2 0 1 1 0 4h-1v4h-4v1a2 2 0 1 1-4 0v-1H5v-4H4a2 2 0 1 1 0-4h1V5h4V4Z" />);
export const IconCopy = make(<><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>);
export const IconGift = make(<><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M3 12h18M12 8v12M8 8a2.5 2.5 0 1 1 0-5c2 0 4 5 4 5M16 8a2.5 2.5 0 1 0 0-5c-2 0-4 5-4 5" /></>);
export const IconPercent = make(<><path d="M6 18 18 6" /><circle cx="7.5" cy="7.5" r="2" /><circle cx="16.5" cy="16.5" r="2" /></>);
export const IconSettings = make(<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></>);
export const IconPackage = make(<><path d="M12 3 3 7v10l9 4 9-4V7l-9-4Z" /><path d="M3 7l9 4 9-4M12 11v10" /></>);
export const IconUsers = make(<><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 20a6 6 0 0 0-2-4.5" /></>);
export const IconChat = make(<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H7l-4 3v-6A8.5 8.5 0 0 1 11.5 3h1A8.5 8.5 0 0 1 21 11.5Z" />);
export const IconDashboard = make(<><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>);
export const IconReceipt = make(<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6M9 16h3" /></>);
export const IconInstagram = make(<><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17" cy="7" r="1" /></>);
export const IconFacebook = make(<path d="M14 9h3V5h-3a4 4 0 0 0-4 4v2H7v4h3v6h4v-6h3l1-4h-4V9a1 1 0 0 1 1-1Z" />);
export const IconYoutube = make(<><rect x="2" y="6" width="20" height="12" rx="4" /><path d="m10 9 5 3-5 3V9Z" /></>);
export const IconWhatsApp = ({ size = 20, className = '' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.5 14.2c-.2.6-1.3 1.2-1.8 1.2-.5 0-1 .2-3.4-.7-2.4-1-3.9-3.4-4-3.6-.2-.2-1-1.4-1-2.6 0-1.3.6-1.9.9-2.1.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .6l-.4.6c-.2.2-.3.3-.1.6.2.3.7 1.2 1.6 1.9 1.1.9 1.5 1 1.8 1 .2 0 .4-.1.5-.3l.7-.8c.2-.2.3-.2.6-.1l1.8.9c.3.1.4.2.5.3 0 .2 0 .8-.3 1.3Z" />
  </svg>
);
export const IconMap = make(<><path d="m9 4 6 2 6-2v14l-6 2-6-2-6 2V6l6-2Z" /><path d="M9 4v14M15 6v14" /></>);
