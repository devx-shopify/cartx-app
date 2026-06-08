/* eslint-disable */
import { h, Component } from 'preact';
import { fetchCart, cartUpdateAll, internalFetch, formatMoney, resizeImage, updateCartCount, trapFocus, applyDrawerSettings, dispatchOptimistic, simulateAdd, simulateCouponRemove } from './helpers';
import { fireConfetti, setConfettiLottieUrl } from './confetti';
import { waitForEvaluate } from './evaluate';
import { tracker } from './tracker';
import { ANALYTICS_EVENTS } from './analytics-events';

// ── Timing constants ────────────────────────────────────────

var CLOSE_DELAY = 250;
var DEBOUNCE_DELAY = 300;
var REMOVE_ANIM_DELAY = 0;
var TOMBSTONE_HOLD_MS = 280;   // matches the cartmax-line-removing CSS transition
var PROCESSING_TIMEOUT = 10000;
var INLINE_ERROR_HOLD_MS = 4000;

// ── SVG Icons (inline for zero network cost) ────────────────

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

function IconMinus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M5 12h14" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M12 5v14" /><path d="M5 12h14" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.87183 13.6667C4.53939 13.6667 4.25539 13.549 4.01983 13.3135C3.78439 13.0779 3.66667 12.794 3.66667 12.4615V4.00001H3V3.00001H6V2.41034H10V3.00001H13V4.00001H12.3333V12.4615C12.3333 12.7983 12.2167 13.0833 11.9833 13.3167C11.75 13.55 11.4649 13.6667 11.1282 13.6667H4.87183ZM11.3333 4.00001H4.66667V12.4615C4.66667 12.5214 4.68589 12.5706 4.72433 12.609C4.76278 12.6474 4.81194 12.6667 4.87183 12.6667H11.1282C11.1795 12.6667 11.2265 12.6453 11.2692 12.6025C11.3119 12.5598 11.3333 12.5128 11.3333 12.4615V4.00001ZM6.26933 11.3333H7.26917V5.33334H6.26933V11.3333ZM8.73083 11.3333H9.73067V5.33334H8.73083V11.3333Z" fill="currentColor"/>
    </svg>
  );
}

function IconBag() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function IconGift() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

function IconDiscountBadge() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.99996 14.3334C7.75896 14.3334 7.52935 14.2883 7.31113 14.1982C7.09279 14.1081 6.89935 13.9779 6.73079 13.8077C6.39568 13.4769 6.10829 13.2605 5.86863 13.1584C5.62885 13.0562 5.26924 13.0052 4.78979 13.0052C4.29113 13.0052 3.86729 12.8307 3.51829 12.4817C3.16929 12.1327 2.99479 11.7089 2.99479 11.2102C2.99479 10.7351 2.94357 10.3764 2.84113 10.1342C2.73868 9.89196 2.5224 9.60363 2.19229 9.26919C2.02051 9.09741 1.88996 8.90258 1.80063 8.68469C1.71129 8.4668 1.66663 8.23902 1.66663 8.00135C1.66663 7.76369 1.71129 7.53547 1.80063 7.31669C1.88996 7.09791 2.02051 6.90263 2.19229 6.73085C2.5224 6.39874 2.73868 6.11246 2.84113 5.87202C2.94357 5.63147 2.99479 5.27074 2.99479 4.78985C2.99479 4.29119 3.16929 3.86735 3.51829 3.51835C3.86729 3.16935 4.29113 2.99485 4.78979 2.99485C5.2649 2.99485 5.62357 2.94363 5.86579 2.84119C6.10802 2.73874 6.39635 2.52246 6.73079 2.19235C6.89968 2.02213 7.0934 1.89196 7.31196 1.80185C7.53052 1.71174 7.75902 1.66669 7.99746 1.66669C8.2359 1.66669 8.46452 1.71135 8.68329 1.80069C8.90207 1.89002 9.09735 2.02058 9.26913 2.19235C9.60124 2.52246 9.88752 2.73874 10.128 2.84119C10.3685 2.94363 10.7292 2.99485 11.2101 2.99485C11.7088 2.99485 12.1326 3.16935 12.4816 3.51835C12.8306 3.86735 13.0051 4.29119 13.0051 4.78985C13.0051 5.26497 13.0563 5.62363 13.1588 5.86585C13.2612 6.10808 13.4775 6.39641 13.8076 6.73085C13.9794 6.90263 14.11 7.09746 14.1993 7.31535C14.2886 7.53324 14.3333 7.76102 14.3333 7.99869C14.3333 8.23635 14.2886 8.46458 14.1993 8.68335C14.11 8.90213 13.9794 9.09741 13.8076 9.26919C13.4768 9.6043 13.2604 9.89169 13.1583 10.1314C13.0562 10.3711 13.0051 10.7307 13.0051 11.2102C13.0051 11.7089 12.8306 12.1327 12.4816 12.4817C12.1326 12.8307 11.7088 13.0052 11.2101 13.0052C10.735 13.0052 10.3763 13.0564 10.1341 13.1589C9.8919 13.2613 9.60357 13.4776 9.26913 13.8077C9.10057 13.9779 8.90713 14.1081 8.68879 14.1982C8.47057 14.2883 8.24096 14.3334 7.99996 14.3334ZM8.00079 13.3334C8.10624 13.3334 8.20918 13.3118 8.30963 13.2687C8.41007 13.2255 8.49446 13.1697 8.56279 13.1014C8.98413 12.6757 9.38229 12.3866 9.75729 12.234C10.1322 12.0815 10.6165 12.0052 11.2101 12.0052C11.4353 12.0052 11.6242 11.929 11.7766 11.7767C11.929 11.6242 12.0051 11.4354 12.0051 11.2102C12.0051 10.6129 12.0814 10.1287 12.234 9.75769C12.3865 9.3868 12.6735 8.98852 13.0948 8.56285C13.2538 8.40385 13.3333 8.21624 13.3333 8.00002C13.3333 7.7838 13.256 7.5983 13.1013 7.44352C12.6756 7.01796 12.3865 6.61769 12.234 6.24269C12.0814 5.8678 12.0051 5.38352 12.0051 4.78985C12.0051 4.56463 11.929 4.3758 11.7766 4.22335C11.6242 4.07102 11.4353 3.99485 11.2101 3.99485C10.6066 3.99485 10.1201 3.91963 9.75063 3.76919C9.38118 3.61863 8.98313 3.33063 8.55646 2.90519C8.48802 2.83674 8.40357 2.77991 8.30313 2.73469C8.20268 2.68935 8.10163 2.66669 7.99996 2.66669C7.89829 2.66669 7.79618 2.68985 7.69363 2.73619C7.59096 2.78263 7.50546 2.83896 7.43713 2.90519C7.01579 3.32652 6.61763 3.61347 6.24263 3.76602C5.86774 3.91858 5.38346 3.99485 4.78979 3.99485C4.56457 3.99485 4.37574 4.07102 4.22329 4.22335C4.07096 4.3758 3.99479 4.56463 3.99479 4.78985C3.99479 5.39152 3.91852 5.8778 3.76596 6.24869C3.6134 6.61969 3.32429 7.01796 2.89863 7.44352C2.74396 7.5983 2.66663 7.7838 2.66663 8.00002C2.66663 8.21624 2.74396 8.40385 2.89863 8.56285C3.32429 8.98852 3.6134 9.38747 3.76596 9.75969C3.91852 10.1319 3.99479 10.6154 3.99479 11.2102C3.99479 11.4354 4.07096 11.6242 4.22329 11.7767C4.37574 11.929 4.56457 12.0052 4.78979 12.0052C5.3919 12.0052 5.87724 12.0815 6.24579 12.234C6.61435 12.3866 7.01357 12.6757 7.44346 13.1014C7.5119 13.1697 7.59552 13.2255 7.69429 13.2687C7.79318 13.3118 7.89535 13.3334 8.00079 13.3334ZM9.62296 10.4424C9.85296 10.4424 10.047 10.3633 10.2051 10.2052C10.3632 10.0471 10.4423 9.85302 10.4423 9.62302C10.4423 9.39291 10.3632 9.19735 10.2051 9.03635C10.047 8.87535 9.85296 8.79485 9.62296 8.79485C9.39285 8.79485 9.19729 8.87535 9.03629 9.03635C8.87529 9.19735 8.79479 9.39291 8.79479 9.62302C8.79479 9.85302 8.87529 10.0471 9.03629 10.2052C9.19729 10.3633 9.39285 10.4424 9.62296 10.4424ZM6.34479 10.3514L10.3513 6.35135L9.64863 5.64869L5.64863 9.65519L6.34479 10.3514ZM6.37696 7.20519C6.60707 7.20519 6.80263 7.12469 6.96363 6.96369C7.12463 6.80269 7.20513 6.60713 7.20513 6.37702C7.20513 6.14702 7.12463 5.95297 6.96363 5.79485C6.80263 5.63674 6.60707 5.55769 6.37696 5.55769C6.14696 5.55769 5.9529 5.63674 5.79479 5.79485C5.63668 5.95297 5.55763 6.14702 5.55763 6.37702C5.55763 6.60713 5.63668 6.80269 5.79479 6.96369C5.9529 7.12469 6.14696 7.20519 6.37696 7.20519Z" fill="#2FC01A"/>
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconRemoveX() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2 13.5 8.5 20 10 13.5 11.5 12 18 10.5 11.5 4 10 10.5 8.5z" />
      <path d="M18 14 18.75 16.75 21.5 17.5 18.75 18.25 18 21 17.25 18.25 14.5 17.5 17.25 16.75z" opacity="0.6" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconPaymentMethods() {
  return (
    <svg width="62" height="24" viewBox="0 0 62 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="0.5" width="23" height="23" rx="11.5" fill="white"/>
      <rect x="0.5" y="0.5" width="23" height="23" rx="11.5" stroke="#D8D9E0"/>
      <path d="M18.286 7.99168C16.7707 7.11701 14.833 7.63668 13.9577 9.15201L11.75 12.9757C11.1113 14.0797 11.9337 14.4657 12.8503 15.0153L14.9743 16.2413C15.6937 16.6563 16.6123 16.41 17.027 15.6917L19.296 11.762C20.0587 10.4417 19.6063 8.75401 18.286 7.99168Z" fill="#E64A19"/>
      <path d="M15.7884 9.57436L13.6644 8.34836C12.492 7.69736 11.828 7.65436 11.3464 8.41969L8.21369 13.8447C7.33902 15.359 7.85969 17.2957 9.37402 18.1684C10.6944 18.9307 12.382 18.4784 13.1444 17.158L16.337 11.628C16.7537 10.909 16.5077 9.98936 15.7884 9.57436Z" fill="#FBC02D"/>
      <path d="M16.197 6.78532L14.705 5.92366C13.055 4.97133 10.945 5.53599 9.99265 7.18599L7.15232 12.1057C6.73265 12.8313 6.98199 13.7603 7.70765 14.179L9.37832 15.1437C10.2033 15.6203 11.258 15.3377 11.7347 14.5123L14.9797 8.89232C15.652 7.72832 17.14 7.32932 18.3043 8.00166L16.197 6.78532Z" fill="#43A047"/>
      <path d="M10.3963 8.59369L8.78367 7.66469C8.06434 7.25069 7.14567 7.49602 6.73101 8.21336L4.79634 11.5567C3.84401 13.202 4.40867 15.3074 6.05867 16.257L7.28634 16.964L8.77534 17.8217L9.42167 18.1934C8.27434 17.4254 7.91001 15.8867 8.61167 14.675L9.11267 13.8097L10.9473 10.6397C11.361 9.92469 11.1147 9.00769 10.3963 8.59369Z" fill="#1E88E5"/>
      <rect x="19.5" y="0.5" width="23" height="23" rx="11.5" fill="white"/>
      <rect x="19.5" y="0.5" width="23" height="23" rx="11.5" stroke="#D8D9E0"/>
      <g clip-path="url(#cartmax-clip-phonepe)">
        <path d="M37.9467 17.0556C37.9467 18.1297 37.0763 19 36.0022 19H25.8911C24.8174 19 23.9467 18.1297 23.9467 17.0556V6.94444C23.9467 5.87033 24.8174 5 25.8911 5H36.0022C37.0763 5 37.9467 5.87033 37.9467 6.94444V17.0556Z" fill="#4527A0"/>
        <path d="M34.1616 10.5109C34.1616 10.2461 33.9345 10.0194 33.67 10.0194H32.7624L30.6818 7.58883C30.4928 7.36171 30.1903 7.28627 29.8873 7.36171L29.1687 7.58883C29.0551 7.62655 29.0174 7.77783 29.0928 7.85366L31.3624 10.0571H27.9203C27.8068 10.0571 27.7313 10.1329 27.7313 10.2461V10.6245C27.7313 10.8893 27.9584 11.2102 28.2229 11.2102H28.9898V12.8843C28.9898 14.2462 29.6163 15.0403 30.8265 15.0403C31.2049 15.0403 31.3624 15.0026 31.7404 14.8513V16.0615C31.7404 16.4018 32.0052 16.6667 32.3455 16.6667H32.6512C32.7647 16.6667 32.8783 16.5531 32.8783 16.4395V11.2102H33.9718C34.0854 11.2102 34.1608 11.1343 34.1608 11.0212V10.5109H34.1616ZM31.7412 13.7162C31.514 13.8297 31.2115 13.8674 30.9848 13.8674C30.3797 13.8674 30.1693 13.5649 30.1693 12.8839V11.2098H31.7415V13.7162H31.7412Z" fill="white"/>
      </g>
      <rect x="38.5" y="0.5" width="23" height="23" rx="11.5" fill="white"/>
      <rect x="38.5" y="0.5" width="23" height="23" rx="11.5" stroke="#D8D9E0"/>
      <path d="M61.0915 10.5647C60.8887 9.98508 60.3363 9.56885 59.6874 9.56885H59.6738C59.2519 9.56885 58.8718 9.74442 58.6012 10.0263C58.3301 9.74442 57.9499 9.56885 57.5285 9.56885H57.515C57.1441 9.56885 56.8052 9.70462 56.5449 9.92936V9.81512C56.536 9.70134 56.4423 9.61193 56.3267 9.61193H55.3313C55.2096 9.61193 55.1113 9.71025 55.1113 9.83244V15.2378C55.1113 15.36 55.2096 15.4583 55.3313 15.4583H56.3267C56.4376 15.4583 56.5289 15.3754 56.5435 15.2682L56.543 11.3878C56.5429 11.3748 56.5435 11.3618 56.5449 11.3489C56.5608 11.1757 56.6877 11.0334 56.8881 11.0156H57.0716C57.1554 11.0231 57.2261 11.0526 57.2818 11.097C57.3684 11.1659 57.4166 11.2717 57.4166 11.3878L57.4204 15.249C57.4204 15.3712 57.5191 15.47 57.6404 15.47H58.6358C58.7533 15.47 58.8488 15.3763 58.8544 15.2598L58.854 11.3826C58.8535 11.2553 58.9125 11.1401 59.016 11.0718C59.067 11.039 59.1283 11.017 59.199 11.0104H59.3826C59.5979 11.0291 59.7281 11.1925 59.7276 11.3826L59.7314 15.2387C59.7314 15.3609 59.8302 15.4592 59.9514 15.4592H60.9468C61.068 15.4592 61.1668 15.3609 61.1668 15.2387V11.0914C61.1668 10.8086 61.135 10.6883 61.0915 10.5647ZM54.353 9.62601H53.7837V8.70085C53.7837 8.58989 53.6938 8.5 53.5828 8.5C53.5697 8.5 53.5571 8.50186 53.5449 8.50421C52.9138 8.67744 53.0402 9.55157 51.888 9.62601H51.776C51.7592 9.62601 51.7433 9.62835 51.7278 9.63162C51.6295 9.65364 51.5555 9.74118 51.5555 9.84607V10.8414C51.5555 10.9627 51.6543 11.0615 51.776 11.0615H52.3767L52.3758 15.2823C52.3758 15.4026 52.4732 15.5 52.5935 15.5H53.5777C53.6975 15.5 53.7949 15.4026 53.7949 15.2823L53.7954 11.0615H54.353C54.4742 11.0615 54.573 10.9627 54.573 10.8414V9.84607C54.573 9.72481 54.4742 9.62601 54.353 9.62601Z" fill="#00BAF2"/>
      <path d="M50.7715 9.62646H49.7761C49.6549 9.62646 49.5566 9.72525 49.5566 9.8465V11.9047C49.5542 12.032 49.4512 12.1341 49.3234 12.1341H48.9067C48.7775 12.1341 48.6731 12.0302 48.6731 11.901L48.6693 9.84652C48.6693 9.72525 48.5705 9.62647 48.4493 9.62647H47.4539C47.3322 9.62647 47.2339 9.72525 47.2339 9.84652V12.1023C47.2339 12.9591 47.8449 13.5701 48.7021 13.5701C48.7021 13.5701 49.3454 13.5701 49.3651 13.5738C49.4812 13.5869 49.5715 13.6843 49.5715 13.8042C49.5715 13.9226 49.4831 14.0195 49.3683 14.0341C49.3627 14.035 49.3576 14.0364 49.3515 14.0373L47.8959 14.0425C47.7742 14.0425 47.6758 14.1413 47.6758 14.2625V15.2575C47.6758 15.3792 47.7742 15.4775 47.8959 15.4775H49.5233C50.381 15.4775 50.9916 14.867 50.9916 14.0097V9.84652C50.9916 9.72525 50.8932 9.62646 50.7715 9.62646ZM41.137 11.4503V12.0646C41.137 12.1933 41.0326 12.2982 40.9038 12.2982L40.2722 12.2987V11.0678H40.9038C41.0326 11.0678 41.137 11.1717 41.137 11.301V11.4503ZM41.2245 9.62622H39.0488C38.9295 9.62622 38.833 9.72314 38.833 9.84206V10.8173C38.833 10.8192 38.8335 10.8211 38.8335 10.8229C38.8335 10.8276 38.833 10.8323 38.833 10.8365V15.2507C38.833 15.3705 38.9229 15.4684 39.0343 15.4712H40.0484C40.1697 15.4712 40.2685 15.3729 40.2685 15.2511L40.2722 13.7384H41.2245C42.0214 13.7384 42.5767 13.1855 42.5767 12.3853V10.9812C42.5767 10.181 42.0214 9.62622 41.2245 9.62622ZM45.2669 13.7872V13.9426C45.2669 13.9553 45.2651 13.9674 45.2632 13.9791C45.2609 13.9901 45.2577 14.0009 45.2538 14.0114C45.2229 14.0985 45.1358 14.1617 45.0324 14.1617H44.618C44.4888 14.1617 44.3835 14.0634 44.3835 13.9426V13.7549C44.3835 13.7525 44.383 13.7502 44.383 13.7479L44.3835 13.2483V13.0919L44.3839 13.0905C44.3844 12.9702 44.4888 12.8728 44.618 12.8728H45.0324C45.1621 12.8728 45.2669 12.9706 45.2669 13.0919L45.2669 13.7872ZM45.1087 9.63194H43.7275C43.6053 9.63194 43.5066 9.72464 43.5066 9.83841V10.2256C43.5066 10.2279 43.507 10.2308 43.507 10.2331C43.507 10.2359 43.5065 10.2387 43.5065 10.2415V10.772C43.5065 10.8923 43.6114 10.9906 43.7407 10.9906H45.0558C45.1597 11.007 45.2421 11.0829 45.2538 11.2013V11.3296C45.2421 11.4425 45.1607 11.5248 45.0614 11.5342H44.4102C43.544 11.5342 42.9269 12.1096 42.9269 12.9177V14.0751C42.9269 14.8785 43.4574 15.4502 44.3175 15.4502H46.1223C46.4463 15.4502 46.709 15.2049 46.709 14.9029V11.1259C46.709 10.2102 46.2371 9.63194 45.1087 9.63194Z" fill="#1F336B"/>
      <defs>
        <clipPath id="cartmax-clip-phonepe">
          <rect x="23.611" y="5" width="14.7778" height="14" rx="2" fill="white"/>
        </clipPath>
      </defs>
    </svg>
  );
}

function IconTag() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 21C11.677 21 11.3714 20.9398 11.0833 20.8195C10.7952 20.6992 10.5399 20.5253 10.3173 20.298C9.79542 19.789 9.34992 19.4563 8.98075 19.3C8.61158 19.1437 8.05775 19.0655 7.31925 19.0655C6.65692 19.0655 6.09383 18.8337 5.63 18.37C5.16633 17.9062 4.9345 17.3431 4.9345 16.6807C4.9345 15.9551 4.85583 15.404 4.6985 15.0275C4.54117 14.651 4.209 14.2028 3.702 13.6827C3.46983 13.4506 3.29483 13.1911 3.177 12.9043C3.059 12.6173 3 12.3173 3 12.0043C3 11.6911 3.059 11.3897 3.177 11.1C3.29483 10.8103 3.46983 10.5494 3.702 10.3173C4.209 9.80442 4.54117 9.36225 4.6985 8.99075C4.85583 8.61925 4.9345 8.06208 4.9345 7.31925C4.9345 6.65692 5.16633 6.09383 5.63 5.63C6.09383 5.16633 6.65692 4.9345 7.31925 4.9345C8.04492 4.9345 8.596 4.85583 8.9725 4.6985C9.349 4.54117 9.79725 4.209 10.3173 3.702C10.5406 3.47467 10.7968 3.30083 11.086 3.1805C11.375 3.06017 11.6772 3 11.9925 3C12.3078 3 12.6103 3.059 12.9 3.177C13.1897 3.29483 13.4506 3.46983 13.6827 3.702C14.1956 4.209 14.6377 4.54117 15.0092 4.6985C15.3807 4.85583 15.9379 4.9345 16.6807 4.9345C17.3431 4.9345 17.9062 5.16633 18.37 5.63C18.8337 6.09383 19.0655 6.65692 19.0655 7.31925C19.0655 8.04492 19.1442 8.596 19.3015 8.9725C19.4588 9.349 19.791 9.79725 20.298 10.3173C20.5302 10.5494 20.7052 10.8089 20.823 11.0958C20.941 11.3828 21 11.6827 21 11.9957C21 12.3089 20.941 12.6103 20.823 12.9C20.7052 13.1897 20.5302 13.4506 20.298 13.6827C19.789 14.2046 19.4563 14.6501 19.3 15.0192C19.1437 15.3884 19.0655 15.9422 19.0655 16.6807C19.0655 17.3431 18.8337 17.9062 18.37 18.37C17.9062 18.8337 17.3431 19.0655 16.6807 19.0655C15.9551 19.0655 15.404 19.1442 15.0275 19.3015C14.651 19.4588 14.2028 19.791 13.6827 20.298C13.4601 20.5253 13.2048 20.6992 12.9167 20.8195C12.6286 20.9398 12.323 21 12 21ZM12.0025 20C12.1855 20 12.3651 19.9644 12.5413 19.8932C12.7176 19.8221 12.8667 19.7256 12.9885 19.6038C13.5692 19.0103 14.122 18.6055 14.647 18.3895C15.1718 18.1735 15.8497 18.0655 16.6807 18.0655C17.0731 18.0655 17.4019 17.9328 17.6673 17.6673C17.9328 17.4019 18.0655 17.0731 18.0655 16.6807C18.0655 15.8551 18.1735 15.1817 18.3895 14.6605C18.6055 14.1393 19.0038 13.582 19.5845 12.9885C19.8615 12.7115 20 12.382 20 12C20 11.618 19.8679 11.2949 19.6038 11.0307C19.0103 10.4372 18.6055 9.878 18.3895 9.353C18.1735 8.82817 18.0655 8.15025 18.0655 7.31925C18.0655 6.92692 17.9328 6.59808 17.6673 6.33275C17.4019 6.06725 17.0731 5.9345 16.6807 5.9345C15.8366 5.9345 15.1562 5.82967 14.6395 5.62C14.1227 5.41017 13.5659 5.00867 12.9693 4.4155C12.8474 4.29367 12.6983 4.19392 12.522 4.11625C12.3458 4.03875 12.1718 4 12 4C11.8282 4 11.6509 4.04042 11.4683 4.12125C11.2856 4.20192 11.1333 4.3 11.0115 4.4155C10.4308 4.99617 9.878 5.3945 9.353 5.6105C8.82817 5.8265 8.15025 5.9345 7.31925 5.9345C6.92692 5.9345 6.59808 6.06725 6.33275 6.33275C6.06725 6.59808 5.9345 6.92692 5.9345 7.31925C5.9345 8.15775 5.8265 8.83758 5.6105 9.35875C5.3945 9.87992 4.98975 10.4372 4.39625 11.0307C4.13208 11.2949 4 11.618 4 12C4 12.382 4.13208 12.7115 4.39625 12.9885C4.98975 13.582 5.3945 14.1371 5.6105 14.6538C5.8265 15.1704 5.9345 15.8461 5.9345 16.6807C5.9345 17.0731 6.06725 17.4019 6.33275 17.6673C6.59808 17.9328 6.92692 18.0655 7.31925 18.0655C8.15908 18.0655 8.836 18.1735 9.35 18.3895C9.86417 18.6055 10.4244 19.0103 11.0308 19.6038C11.1526 19.7256 11.2992 19.8221 11.4707 19.8932C11.6423 19.9644 11.8195 20 12.0025 20ZM14.3688 15.327C14.6421 15.327 14.8702 15.2357 15.053 15.053C15.2357 14.8702 15.327 14.6421 15.327 14.3688C15.327 14.0954 15.2357 13.8631 15.053 13.6718C14.8702 13.4803 14.6421 13.3845 14.3688 13.3845C14.0954 13.3845 13.8631 13.4803 13.6718 13.6718C13.4803 13.8631 13.3845 14.0954 13.3845 14.3688C13.3845 14.6421 13.4803 14.8702 13.6718 15.053C13.8631 15.2357 14.0954 15.327 14.3688 15.327ZM9.5845 15.1038L15.1038 9.60375L14.3962 8.89625L8.89625 14.4155L9.5845 15.1038ZM9.63125 10.6155C9.90458 10.6155 10.1369 10.5198 10.3283 10.3283C10.5198 10.1369 10.6155 9.90458 10.6155 9.63125C10.6155 9.35792 10.5198 9.12983 10.3283 8.947C10.1369 8.76433 9.90458 8.673 9.63125 8.673C9.35792 8.673 9.12983 8.76433 8.947 8.947C8.76433 9.12983 8.673 9.35792 8.673 9.63125C8.673 9.90458 8.76433 10.1369 8.947 10.3283C9.12983 10.5198 9.35792 10.6155 9.63125 10.6155Z" fill="currentColor"/>
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.3335 20.1924L10.1411 14L16.3335 7.80762L17.1592 8.63333L11.7925 14L17.1592 19.3667L16.3335 20.1924Z" fill="currentColor"/>
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.6665 20.1924L10.8408 19.3667L16.2075 14L10.8408 8.63333L11.6665 7.80762L17.8589 14L11.6665 20.1924Z" fill="currentColor"/>
    </svg>
  );
}

var HARDCODED_COUPONS = [
  { code: 'SAVE100',     accent: '₹100 OFF', savings: 'Save ₹100 on this order' },
  { code: 'ENDYEARSALE', accent: '20% OFF',  savings: 'Save 20% on this order'  },
  { code: 'FLAT200',     accent: '₹200 OFF', savings: 'Save ₹200 on this order' },
];

// ── CartDrawer Component ────────────────────────────────────

export default class CartDrawer extends Component {
  constructor() {
    super();
    this.state = {
      visible: false,
      open: false,
      cart: null,
      loading: true,
      updating: {},
      removing: {},
      pendingQty: {},
      evalResult: null,
      savings: 0,
      unavailableGifts: [],
      claimed: {},        // key -> true, button-level optimistic state for freebie claims
      claimError: {},     // key -> message, inline error shown on offer/claim card
      upsellError: null,  // brief error message displayed near upsell list on rollback
      variantOpen: {},        // item.key -> bool, controls dropdown visibility
      variantLoading: {},     // item.key -> bool, true while fetching product variants
      priceBreakupOpen: false,
    };
    this.close = this.close.bind(this);
    this.handleOverlayClick = this.handleOverlayClick.bind(this);
    this._closeTimer = null;
    this._focusCleanup = null;
    this._triggerElement = null;
    this._drawerRef = null;
    this._debounceTimers = {};
    this._processingTimeout = null;
    this._removingTombstones = {};       // key -> snapshotted item, kept in DOM during fade
    this._tombstoneTimers = {};          // key -> setTimeout handle
    this._pendingGiftRemovals = {};      // key -> { promotion_id, promotion_type, variant_id } for analytics
    this._errorTimers = {};              // key -> setTimeout handle for clearing inline errors
    this._currency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'USD';
    this._prevActiveTiers = {};
    this._confettiInitialized = false;
    this._confettiEnabled = true;
    this._appliedDrawerHash = null;
    this._text = {
      cart_title: 'Your Cart', empty_title: 'Your cart is empty',
      empty_subtitle: "Looks like you haven't added anything yet",
      empty_button: 'Continue shopping', checkout_button: 'Checkout',
      continue_shopping: 'Continue shopping', continue_shopping_url: '',
      coupon_placeholder: 'Discount code', total_label: 'Total', subtotal_label: 'Subtotal',
      savings_label: 'Congrats! You saved {amount} on this order.',
      offer_cards_heading: 'Pick your free gift',
      checkout_trust_message: 'Guaranteed safe & secure checkout',
    };
    this._layout = { drawer_position: 'right', image_style: 'rounded', qty_style: 'bordered', show_vendor: false, show_variant_switcher: true, show_remove_btn: true, show_payment_icons: true };
    this._variantCache = {}; // product_id -> variants[]
    this._upsells = { card_layout: 'horizontal', card_size: 'medium', heading: '', btn_text: 'ADD TO CART', show_compare_price: true };
    this._announcement = { text: '', type: 'static' };
    this._progressBar = { track_thickness: 'normal', milestone_icon_svg: '', completed_icon_svg: '' };
    this._shape = { button_style: 'solid' };
    this._sections = { show_progress_bar: true, show_claim_gifts: true, show_offer_cards: true, show_coupons: true, show_upsells: true, show_ribbon: true };
    this._behavior = { auto_open_on_add: true, animation_style: 'slide', close_on_overlay_click: true, close_on_esc: true };
  }

  componentDidMount() {
    this._onCartChanged = (e) => {
      if (e.detail && e.detail.cart) {
        var cart = this._stabiliseOrder(e.detail.cart);
        this._currency = cart.currency || this._currency;
        this.setState({ cart: cart, loading: false });
        updateCartCount(cart.item_count);
      } else {
        this.loadCart();
      }
      if (this._behavior.auto_open_on_add) this.openDrawer();
    };

    this._onEvalResult = (e) => {
      if (e.detail) {
        var patch = { evalResult: e.detail };
        // Only update savings when the result actually carries one (server
        // responses do; optimistic local evals don't). This keeps the ribbon
        // stable between cart change and the next server response.
        if (typeof e.detail.total_savings === 'number') {
          patch.savings = e.detail.total_savings;
        }
        this.setState(patch);
        this._maybeApplyDrawer(e.detail.drawer);
        if (e.detail._server) this._checkConfetti(e.detail);
      }
    };

    this._onInternalReload = (e) => {
      if (e.detail && e.detail.cart) {
        var newCart = this._stabiliseOrder(e.detail.cart);
        var newEval = e.detail.evalResult || this.state.evalResult;
        this._currency = newCart.currency || this._currency;
        if (e.detail.evalResult) {
          this._maybeApplyDrawer(e.detail.evalResult.drawer);
          this._checkConfetti(e.detail.evalResult);
        }

        // Detect removed items for animation. Pending optimistic keys
        // that resolved to a real Shopify key in newCart are NOT removed.
        var oldItems = (this.state.cart && this.state.cart.items) || [];
        var removing = this._detectRemovedKeys(oldItems, newCart);

        // Fire deferred gift-removed analytics for any pending removals
        // the server confirmed (line is gone from newCart). Drop pending
        // entries for keys that came back (server kept the line).
        var pendingRemovals = this._pendingGiftRemovals || {};
        var newKeySet = {};
        (newCart.items || []).forEach(function (it) { newKeySet[it.key] = true; });
        Object.keys(pendingRemovals).forEach((k) => {
          if (!newKeySet[k]) {
            tracker.track(ANALYTICS_EVENTS.GIFT_REMOVED, pendingRemovals[k]);
          }
          delete pendingRemovals[k];
        });

        var newSavings = (newEval && typeof newEval.total_savings === 'number')
          ? newEval.total_savings
          : this.state.savings;

        // Tombstones handle the fade; we can apply newCart immediately
        // without a delay. Lines that ought to fade are in the tombstone
        // map and will be merged in by _displayItems() until their
        // setTimeout clears them.
        this.setState({
          cart: newCart,
          evalResult: newEval,
          savings: newSavings,
          loading: false,
          updating: {},
          removing: Object.keys(removing).length > 0 ? removing : this.state.removing,
          pendingQty: {},
        });
        updateCartCount(newCart.item_count);
        this.announce('Cart updated');
        this._clearProcessingTimeout();
      }
    };

    this._onOptimisticUpdate = (e) => {
      if (e.detail && e.detail.cart) {
        var optimisticCart = this._stabiliseOrder(e.detail.cart);
        this._currency = optimisticCart.currency || this._currency;
        this.setState({ cart: optimisticCart, pendingQty: {} });
        updateCartCount(optimisticCart.item_count);
      }
    };

    this._onGiftUnavailable = (e) => {
      var variants = (e.detail && e.detail.variants) || [];
      this.setState({ unavailableGifts: variants });
    };

    window.addEventListener('cartmax:cart-changed', this._onCartChanged);
    window.addEventListener('cartmax:eval-result', this._onEvalResult);
    window.addEventListener('cartmax:internal-reload', this._onInternalReload);
    window.addEventListener('cartmax:optimistic-update', this._onOptimisticUpdate);
    window.addEventListener('cartmax:gift-unavailable', this._onGiftUnavailable);

    window.__cartmaxReady = true;
    if (window.__cartmaxQueue && window.__cartmaxQueue.length > 0) {
      this.loadCart();
      this.openDrawer();
      window.__cartmaxQueue = [];
    }

    // ── Analytics tracker ────────────────────────────────────
    var rootEl = document.getElementById('cartmax-root');
    if (rootEl) {
      var analyticsEnabled = rootEl.dataset.analyticsEnabled !== 'false';
      tracker.init({
        shopId: rootEl.dataset.shopId || '',
        customerId: rootEl.dataset.customerId || null,
        proxyBase: rootEl.dataset.proxyBase || '/apps/cartmax',
        enabled: analyticsEnabled,
      });
    }

    // promotion_viewed dedupes per session in the tracker. We attach one
    // IntersectionObserver and observe any node tagged with data-cartmax-promo-id.
    this._promoObserver = (typeof IntersectionObserver !== 'undefined')
      ? new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            var el = entry.target;
            var id = el.getAttribute('data-cartmax-promo-id');
            var type = el.getAttribute('data-cartmax-promo-type');
            if (id) tracker.trackPromotionView(id, type);
            this._promoObserver.unobserve(el);
          });
        }, { threshold: 0.5 })
      : null;

    // ── Public API for third-party apps ──────────────────
    var self = this;
    window.cartx = {
      open: function () { self.loadCart(); self.openDrawer(); },
      close: function () { self.close(); },
      toggle: function () { self.state.open ? self.close() : (self.loadCart(), self.openDrawer()); },
      refresh: function () { self.loadCart(); window.dispatchEvent(new CustomEvent('cartmax:cart-changed', { detail: {} })); },
      isOpen: function () { return self.state.open; },
    };

    // Cart icon selectors — broadened to cover Dawn, Refresh, Sense, Origin,
    // Horizon, and other modern Shopify themes that wrap the icon in a
    // custom element or use newer aria patterns.
    var CART_ICON_SELECTORS = [
      'a[href="/cart"]',
      'a[href="/cart/"]',
      'a[href^="/cart?"]',
      '[data-cart-icon]',
      '[data-cart-trigger]',
      '[data-cart-link]',
      '#cart-icon-bubble',
      '#cart-bubble',
      '#CartBubble',
      'cart-icon-bubble',
      '[aria-controls*="cart-drawer"]',
      '[aria-controls*="CartDrawer"]',
      '[aria-controls*="Cart-drawer"]',
      // Horizon: the icon is a direct-child <button> of <cart-drawer-component>.
      // The <dialog> sibling we strip below, so this selector only ever matches
      // the icon trigger button, never anything inside the drawer body.
      'cart-drawer-component > button',
    ].join(', ');

    // Cart icon click — open drawer. Capture phase + stopImmediatePropagation
    // so a host theme's own listener (e.g. Horizon's cart-drawer-component)
    // never gets a chance to fire.
    this._onDocClick = (e) => {
      var link = e.target.closest(CART_ICON_SELECTORS);
      if (link) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') {
          e.stopImmediatePropagation();
        }
        this._triggerElement = link;
        this.loadCart();
        this.openDrawer();
      }
    };
    document.addEventListener('click', this._onDocClick, true);

    // Cart icon hover — prefetch cart data so open is instant
    this._onDocMouseover = (e) => {
      var link = e.target.closest(CART_ICON_SELECTORS);
      if (link && !this._hoverPrefetched) {
        this._hoverPrefetched = true;
        this.loadCart();
        // Reset after 10s so next hover prefetches again
        setTimeout(() => { this._hoverPrefetched = false; }, 10000);
      }
    };
    document.addEventListener('mouseover', this._onDocMouseover, { passive: true });

    this._onDocKeydown = (e) => {
      if (e.key === 'Escape' && this.state.open && this._behavior.close_on_esc) this.close();
    };
    document.addEventListener('keydown', this._onDocKeydown);

    // ── Host-theme compatibility ─────────────────────────────
    // Themes like Shopify Horizon nest the cart icon BUTTON inside a
    // <cart-drawer-component> wrapper that also contains a native <dialog>
    // for the drawer body. The wrapper must stay in the DOM (the icon
    // depends on it), but we strip the inner <dialog> so Horizon's
    // showModal() call has nothing to show and can't add scroll-lock.
    this._installThemeCompat();
  }

  _installThemeCompat() {
    var DRAWER_BODY_SELECTOR = 'cart-drawer-component > dialog, cart-notification-component > dialog';

    function purgeNativeDrawerBodies(root) {
      try {
        if (root && root.matches && root.matches(DRAWER_BODY_SELECTOR)) {
          root.remove();
          return;
        }
        if (root && root.querySelectorAll) {
          root.querySelectorAll(DRAWER_BODY_SELECTOR).forEach(function (el) {
            el.remove();
          });
        }
      } catch (_) { /* detached node, ignore */ }
    }

    // Initial purge — strip any dialog Horizon already rendered.
    purgeNativeDrawerBodies(document);

    // Watch for re-adds (theme JS may re-mount the dialog on navigation).
    this._horizonObserver = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          purgeNativeDrawerBodies(added[j]);
        }
      }
    });
    this._horizonObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Safety net: only strips classes that are unambiguously cart-related.
    // We deliberately do NOT touch generic classes like 'overflow-hidden'
    // or 'no-scroll' — those are commonly used by non-cart modals
    // (search drawers, login overlays) and stripping them would break the
    // host theme's other components. Inline html style is also left alone
    // for the same reason.
    var SCROLL_LOCK_CLASSES = ['scroll-lock', 'cart-drawer-open'];
    function cleanScrollLock() {
      var html = document.documentElement;
      for (var i = 0; i < SCROLL_LOCK_CLASSES.length; i++) {
        if (html.classList.contains(SCROLL_LOCK_CLASSES[i])) {
          html.classList.remove(SCROLL_LOCK_CLASSES[i]);
        }
      }
    }
    cleanScrollLock();
    this._scrollLockObserver = new MutationObserver(cleanScrollLock);
    this._scrollLockObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  componentWillUnmount() {
    window.removeEventListener('cartmax:cart-changed', this._onCartChanged);
    window.removeEventListener('cartmax:eval-result', this._onEvalResult);
    window.removeEventListener('cartmax:internal-reload', this._onInternalReload);
    window.removeEventListener('cartmax:optimistic-update', this._onOptimisticUpdate);
    window.removeEventListener('cartmax:gift-unavailable', this._onGiftUnavailable);
    document.removeEventListener('click', this._onDocClick, true);
    document.removeEventListener('mouseover', this._onDocMouseover);
    document.removeEventListener('keydown', this._onDocKeydown);
    if (this._horizonObserver) this._horizonObserver.disconnect();
    if (this._scrollLockObserver) this._scrollLockObserver.disconnect();
    if (this._promoObserver) this._promoObserver.disconnect();
    Object.values(this._debounceTimers).forEach(clearTimeout);
    Object.values(this._tombstoneTimers || {}).forEach(clearTimeout);
    Object.values(this._errorTimers || {}).forEach(clearTimeout);
    if (this._upsellErrorTimer) clearTimeout(this._upsellErrorTimer);
    this._clearProcessingTimeout();
    tracker.flush({ useBeacon: true });
  }

  // Ref callback for elements that represent a promotion impression target.
  _observePromo(el) {
    if (!el || !this._promoObserver) return;
    this._promoObserver.observe(el);
  }

  // ── Apply drawer config to instance properties ──────────

  // Gates the heavier drawer-config side effects (CSS vars, custom-CSS injection,
  // font loading, lottie preload) so they only run when the config actually
  // changes. Without this, every cart operation re-applies them and interrupts
  // the .cartmax-progress-fill width transition, causing the bar to flicker.
  _maybeApplyDrawer(drawer) {
    if (!drawer) return;
    var hash;
    try { hash = JSON.stringify(drawer); } catch (_) { hash = null; }
    if (hash !== null && hash === this._appliedDrawerHash) return;
    this._appliedDrawerHash = hash;
    applyDrawerSettings(drawer);
    this._applyDrawerConfig(drawer);
    var beh = drawer.behavior;
    if (beh && beh.confetti_lottie_url) setConfettiLottieUrl(beh.confetti_lottie_url);
  }

  _applyDrawerConfig(drawer) {
    if (!drawer) return;
    var t = drawer.text || {};
    this._text = Object.assign({}, this._text, t);
    var l = drawer.layout || {};
    this._layout = {
      drawer_position: l.drawer_position || 'right',
      image_style: l.image_style || 'rounded',
      qty_style: l.qty_style || 'bordered',
      show_vendor: l.show_vendor === true,
      show_variant_switcher: l.show_variant_switcher !== false,
      show_remove_btn: l.show_remove_btn !== false,
      empty_icon_url: l.empty_icon_url || '',
      empty_icon_size: l.empty_icon_size || 'medium',
      empty_icon_color: l.empty_icon_color || '',
      show_payment_icons: l.show_payment_icons !== false,
    };
    this._upsells = {
      card_layout: l.upsells_card_layout || 'horizontal',
      card_size: l.upsells_card_size || 'medium',
      heading: l.upsells_heading || '',
      heading_position: l.upsells_heading_position || 'left',
      show_on_empty: l.upsells_show_on_empty || 'filled',
      btn_text: l.upsells_btn_text || 'ADD TO CART',
      show_compare_price: l.upsells_show_compare_price !== false,
    };
    var ab = drawer.announcement_bar || {};
    this._announcement = {
      text: ab.text || '',
      type: ab.type || 'static',
    };
    var pb = drawer.progress_bar || {};
    this._progressBar = {
      track_thickness: pb.track_thickness || 'normal',
      milestone_icon_svg: pb.milestone_icon_svg || '',
      completed_icon_svg: pb.completed_icon_svg || '',
    };
    var sh = drawer.shape || {};
    this._shape = { button_style: sh.button_style || 'solid' };
    this._coupons = Array.isArray(drawer.coupons) ? drawer.coupons : [];
    var sec = drawer.sections || {};
    this._sections = {
      show_progress_bar: sec.show_progress_bar !== false,
      show_claim_gifts: sec.show_claim_gifts !== false,
      show_offer_cards: sec.show_offer_cards !== false,
      show_coupons: sec.show_coupons !== false,
      show_upsells: sec.show_upsells !== false,
      show_ribbon: sec.show_ribbon !== false,
    };
    var beh = drawer.behavior || {};
    this._behavior = {
      auto_open_on_add: beh.auto_open_on_add !== false,
      animation_style: beh.animation_style || 'slide',
      close_on_overlay_click: beh.close_on_overlay_click !== false,
      close_on_esc: beh.close_on_esc !== false,
    };
    this._confettiEnabled = beh.confetti !== false;
    this._injectCustomCSS(drawer.advanced && drawer.advanced.custom_css);
    this._loadCustomFont(drawer.typography);
  }

  _injectCustomCSS(css) {
    var existing = document.getElementById('cartmax-custom-css');
    if (existing) existing.remove();
    if (!css) return;
    if (/<\/style|<script|javascript:|expression\(|@import/i.test(css)) return;
    var style = document.createElement('style');
    style.id = 'cartmax-custom-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  _loadCustomFont(typo) {
    if (!typo || typo.font_source !== 'custom' || !typo.custom_font_url) return;
    if (document.getElementById('cartmax-custom-font')) return;
    var link = document.createElement('link');
    link.id = 'cartmax-custom-font';
    link.rel = 'stylesheet';
    link.href = typo.custom_font_url;
    document.head.appendChild(link);
    // Extract font family name from Google Fonts URL
    var match = typo.custom_font_url.match(/family=([^:&]+)/);
    if (match) {
      var family = decodeURIComponent(match[1]).replace(/\+/g, ' ');
      var root = document.getElementById('cartmax-root');
      if (root) root.style.setProperty('--cartmax-font-family', '"' + family + '"');
    }
  }

  // ── Confetti on milestone unlock ─────────────────────────

  _checkConfetti(evalResult) {
    var bar = evalResult && evalResult.bar;
    if (!bar || !bar.tiers) return;

    var newActive = {};
    for (var i = 0; i < bar.tiers.length; i++) {
      var tier = bar.tiers[i];
      var key = tier.label || String(i);
      if (tier.state === 'active') newActive[key] = true;
    }

    // First eval — just record initial state, never fire
    if (!this._confettiInitialized) {
      this._confettiInitialized = true;
      this._prevActiveTiers = newActive;
      return;
    }

    // Detect newly activated tiers
    var prev = this._prevActiveTiers;
    var hasNew = false;
    for (var k in newActive) {
      if (newActive.hasOwnProperty(k) && !prev[k]) hasNew = true;
    }

    this._prevActiveTiers = newActive;

    // Fire only if drawer is open and confetti is enabled
    if (hasNew && this._confettiEnabled && this.state.open) {
      fireConfetti();
    }
  }

  // ── Stable item ordering ─────────────────────────────────
  // Shopify's cart API can return items in different order.
  // This preserves the order the user last saw to prevent jitter.
  // Also aliases optimistic `pending_*` keys to the real Shopify key
  // they reconcile to (matched by variant_id + properties signature)
  // so an optimistic-add line keeps its slot when the real cart lands.

  _stabiliseOrder(cart) {
    if (!cart || !cart.items) return cart;
    var oldItems = (this.state.cart && this.state.cart.items) || [];
    if (oldItems.length === 0) return cart;

    var oldOrder = {};
    var pendingOldItems = [];
    oldItems.forEach(function (item, idx) {
      oldOrder[item.key] = idx;
      if (typeof item.key === 'string' && item.key.indexOf('pending_') === 0) {
        pendingOldItems.push(item);
      }
    });

    // Alias each pending key to a same-variant real-key in the new cart,
    // first-match-wins so duplicate pending entries each get a distinct
    // partner.
    var aliasFromReal = {};   // realKey -> oldOrder position to inherit
    var claimed = {};
    for (var p = 0; p < pendingOldItems.length; p++) {
      var pend = pendingOldItems[p];
      for (var q = 0; q < cart.items.length; q++) {
        var n = cart.items[q];
        if (claimed[n.key]) continue;
        if (typeof n.key === 'string' && n.key.indexOf('pending_') === 0) continue;
        if (String(n.variant_id) !== String(pend.variant_id)) continue;
        claimed[n.key] = true;
        aliasFromReal[n.key] = oldOrder[pend.key];
        break;
      }
    }

    var sorted = cart.items.slice().sort(function (a, b) {
      var ia = aliasFromReal.hasOwnProperty(a.key) ? aliasFromReal[a.key]
        : (oldOrder.hasOwnProperty(a.key) ? oldOrder[a.key] : 99999);
      var ib = aliasFromReal.hasOwnProperty(b.key) ? aliasFromReal[b.key]
        : (oldOrder.hasOwnProperty(b.key) ? oldOrder[b.key] : 99999);
      return ia - ib;
    });
    return Object.assign({}, cart, { items: sorted });
  }

  // Compute the set of old keys that have NO matching new key — used to
  // play the remove-fade animation. Pending keys that aliased to a real
  // key are NOT considered removed (their optimistic line is being
  // promoted to the real line, not removed).
  _detectRemovedKeys(oldItems, newCart) {
    var newKeys = {};
    var pendingReals = {};   // real keys claimed by a pending alias
    (newCart.items || []).forEach(function (item) { newKeys[item.key] = true; });

    // Claim a real key for each pending old item (mirrors _stabiliseOrder).
    var claimed = {};
    oldItems.forEach(function (oldItem) {
      if (!(typeof oldItem.key === 'string' && oldItem.key.indexOf('pending_') === 0)) return;
      for (var q = 0; q < (newCart.items || []).length; q++) {
        var n = newCart.items[q];
        if (claimed[n.key]) continue;
        if (typeof n.key === 'string' && n.key.indexOf('pending_') === 0) continue;
        if (String(n.variant_id) !== String(oldItem.variant_id)) continue;
        claimed[n.key] = true;
        pendingReals[oldItem.key] = true;   // this pending was matched
        break;
      }
    });

    var removing = {};
    oldItems.forEach(function (item) {
      if (newKeys[item.key]) return;
      if (pendingReals[item.key]) return;   // optimistic add got reconciled
      removing[item.key] = true;
    });
    return removing;
  }

  // ── Cart data ─────────────────────────────────────────────

  async loadCart() {
    if (!this.state.cart) {
      this.setState({ loading: true });
    }
    try {
      var cart = this._stabiliseOrder(await fetchCart());
      this._currency = cart.currency || this._currency;
      this.setState({ cart: cart, loading: false });
      updateCartCount(cart.item_count);
    } catch (err) {
      this.setState({ loading: false });
    }
  }

  // ── Open / Close ──────────────────────────────────────────

  openDrawer() {
    if (this._closeTimer) {
      clearTimeout(this._closeTimer);
      this._closeTimer = null;
    }
    // Already fully open — skip re-animation to prevent flicker
    if (this.state.visible && this.state.open) return;
    if (!this._triggerElement) {
      this._triggerElement = document.activeElement;
    }
    this.setState({ visible: true, open: false }, () => {
      requestAnimationFrame(() => {
        this.setState({ open: true });
        requestAnimationFrame(() => {
          if (this._drawerRef) {
            this._focusCleanup = trapFocus(this._drawerRef);
          }
        });
      });
    });
    document.body.style.overflow = 'hidden';
    this.announce('Cart opened');
    window.dispatchEvent(new CustomEvent('cartmax:drawer-opened'));

    this._openedAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    var cart = this.state.cart;
    tracker.track(ANALYTICS_EVENTS.DRAWER_OPENED, {
      cart_total: cart ? cart.total_price : null,
      item_count: cart ? cart.item_count : null,
    });
  }

  close() {
    if (this._focusCleanup) {
      this._focusCleanup();
      this._focusCleanup = null;
    }
    this.setState({ open: false });
    document.body.style.overflow = '';
    this._closeTimer = setTimeout(() => {
      this.setState({ visible: false });
      this._closeTimer = null;
    }, CLOSE_DELAY);
    if (this._triggerElement && this._triggerElement.focus) {
      this._triggerElement.focus();
      this._triggerElement = null;
    }
    this.announce('Cart closed');

    if (this._openedAt != null) {
      var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      var dwellMs = Math.max(0, Math.round(now - this._openedAt));
      var cart = this.state.cart;
      tracker.track(ANALYTICS_EVENTS.DRAWER_CLOSED, {
        cart_total: cart ? cart.total_price : null,
        item_count: cart ? cart.item_count : null,
        dwell_ms: dwellMs,
      });
      this._openedAt = null;
    }
  }

  handleOverlayClick() {
    if (this._behavior.close_on_overlay_click) this.close();
  }

  // ── Processing safety timeout ──────────────────────────────

  _startProcessingTimeout() {
    this._clearProcessingTimeout();
    this._processingTimeout = setTimeout(() => {
      console.warn('[cartx] Processing timeout — forcing recovery');
      this.setState({ updating: {}, removing: {}, pendingQty: {} });
      this.loadCart();
    }, PROCESSING_TIMEOUT);
  }

  _clearProcessingTimeout() {
    if (this._processingTimeout) {
      clearTimeout(this._processingTimeout);
      this._processingTimeout = null;
    }
  }

  // ── Quantity changes (debounced) ──────────────────────────

  queueQuantityChange(key, qty) {
    var pendingQty = Object.assign({}, this.state.pendingQty);
    pendingQty[key] = qty;
    this.setState({ pendingQty: pendingQty });
    if (this._debounceTimers[key]) clearTimeout(this._debounceTimers[key]);
    this._debounceTimers[key] = setTimeout(() => {
      delete this._debounceTimers[key];
      this.flushQuantityChange(key, qty);
    }, DEBOUNCE_DELAY);
  }

  flushQuantityChange(key, qty) {
    var updating = Object.assign({}, this.state.updating);
    updating[key] = true;
    this.setState({ updating: updating });
    this._startProcessingTimeout();
    window.dispatchEvent(new CustomEvent('cartmax:cart-action', {
      detail: { cart: this.state.cart, action: { key: key, qty: qty } },
    }));
    this.announce('Updating cart...');
  }

  // ── Remove item (optimistic with tombstone fade) ──────────
  // 1. Snapshot the line as a tombstone so it stays in DOM for the fade.
  // 2. Dispatch cart-action synchronously — totals + bar update immediately
  //    via evaluate.js → cartmax:optimistic-update.
  // 3. After TOMBSTONE_HOLD_MS, drop the tombstone. Analytics fire only when
  //    the server reconcile confirms the removal.

  handleRemove(key) {
    if (this._debounceTimers[key]) {
      clearTimeout(this._debounceTimers[key]);
      delete this._debounceTimers[key];
    }

    var cart = this.state.cart;
    var line = cart && cart.items && cart.items.find(function (i) { return i.key === key; });

    // Defer GIFT_REMOVED analytics until reconcile confirms (see _onInternalReload).
    if (line && line.properties && line.properties._freebie === 'true') {
      this._pendingGiftRemovals[key] = {
        promotion_id: line.properties._offer_id || null,
        promotion_type: line.properties._cartmax_claim === 'true' ? 'claim-gift' : 'offer',
        variant_id: String(line.variant_id),
      };
    }

    // Stash the line as a tombstone so the fade can play while the
    // optimistic update strips the line from state.cart.
    if (line) this._removingTombstones[key] = line;

    var removing = Object.assign({}, this.state.removing);
    removing[key] = true;
    var updating = Object.assign({}, this.state.updating);
    updating[key] = true;
    this.setState({ removing: removing, updating: updating });
    this._startProcessingTimeout();

    window.dispatchEvent(new CustomEvent('cartmax:cart-action', {
      detail: { cart: this.state.cart, action: { key: key, qty: 0 } },
    }));
    this.announce('Removing item...');

    // Drop the tombstone after the fade. The line may already be gone from
    // state.cart by now (optimistic update fired); the tombstone is the
    // only thing keeping it visible.
    if (this._tombstoneTimers[key]) clearTimeout(this._tombstoneTimers[key]);
    this._tombstoneTimers[key] = setTimeout(() => {
      delete this._tombstoneTimers[key];
      delete this._removingTombstones[key];
      var nextRemoving = Object.assign({}, this.state.removing);
      delete nextRemoving[key];
      this.setState({ removing: nextRemoving });
    }, TOMBSTONE_HOLD_MS);
  }

  // Render-time merge: list items currently in cart, plus any tombstoned
  // items not in cart (so the fade can finish before they unmount).
  _displayItems() {
    var cart = this.state.cart;
    var cartItems = (cart && cart.items) || [];
    var inCart = {};
    cartItems.forEach(function (item) { inCart[item.key] = true; });
    var merged = cartItems.slice();
    var tombs = this._removingTombstones || {};
    Object.keys(tombs).forEach(function (key) {
      if (!inCart[key]) merged.push(tombs[key]);
    });
    return merged;
  }

  // ── Accessibility ─────────────────────────────────────────

  announce(msg) {
    var el = document.getElementById('cartmax-live-region');
    if (el) el.textContent = msg;
  }

  getDisplayQty(item) {
    if (this.state.pendingQty.hasOwnProperty(item.key)) {
      return this.state.pendingQty[item.key];
    }
    return item.quantity;
  }

  // ── Render: Announcement Bar ─────────────────────────────

  renderAnnouncementBar() {
    var a = this._announcement;
    if (!a.text) return null;
    if (a.type === 'marquee') {
      return (
        <div class="cartmax-announcement cartmax-announcement--marquee">
          <div class="cartmax-announcement-track">
            <span class="cartmax-announcement-item">{a.text}</span>
            <span class="cartmax-announcement-item" aria-hidden="true">{a.text}</span>
          </div>
        </div>
      );
    }
    return <div class="cartmax-announcement cartmax-announcement--static">{a.text}</div>;
  }

  // ── Render: Progress Bar ──────────────────────────────────

  renderProgressBar() {
    var result = this.state.evalResult;
    if (!result || !result.bar || !result.bar.tiers || result.bar.tiers.length === 0) {
      return null;
    }
    var bar = result.bar;
    var tiers = bar.tiers;
    var n = tiers.length;
    var pct = Math.min(bar.progress_pct || 0, 100);
    // Leave room so last milestone label doesn't clip at the right edge
    var trackPadRight = 30;
    var usableWidth = 100;

    var pb = this._progressBar;
    var milestoneIconSvg = pb.milestone_icon_svg || '';
    var completedIconSvg = pb.completed_icon_svg || milestoneIconSvg;

    return (
      <div id="cartmax-progress" className="cartmax-progress">
        {bar.top_message ? (
          <div class="cartmax-progress-msg-wrap">
            <div class="cartmax-progress-msg">
              <span>{bar.top_message}</span>
            </div>
          </div>
        ) : null}
        <div className="cartmax-progress-track" style={{ marginRight: trackPadRight + 'px' }}>
          <div className="cartmax-progress-fill" style={{ width: pct + '%' }} ><span className='visually-hidden'>Progress fill</span></div>
          {tiers.map((tier, i) => {
            var pos = ((i + 1) / n) * usableWidth;
            var cls = 'cartmax-milestone';
            var isActive = tier.state === 'active';
            if (isActive) cls += ' cartmax-milestone--active';
            else if (tier.state === 'next') cls += ' cartmax-milestone--next';
            var self = this;

            var customSvgForState = isActive ? completedIconSvg : milestoneIconSvg;
            if (customSvgForState) cls += ' cartmax-milestone--custom';

            var dotContent;
            if (isActive) {
              if (completedIconSvg) {
                dotContent = <span class="cartmax-milestone-custom-icon" dangerouslySetInnerHTML={{ __html: completedIconSvg }} />;
              } else {
                dotContent = <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>;
              }
            } else {
              if (milestoneIconSvg) {
                dotContent = <span class="cartmax-milestone-custom-icon" dangerouslySetInnerHTML={{ __html: milestoneIconSvg }} />;
              } else {
                dotContent = <span class="visually-hidden">Milestone</span>;
              }
            }

            return (
              <div
                class={cls}
                style={{ left: pos + '%' }}
                key={tier.id || i}
                data-cartmax-promo-id={tier.promotion_id || undefined}
                data-cartmax-promo-type={tier.promotion_type || undefined}
                ref={tier.promotion_id ? function (el) { self._observePromo(el); } : undefined}
              >
                <div class="cartmax-milestone-dot">
                  {dotContent}
                </div>
                <div class="cartmax-milestone-label">
                  <div class="cartmax-milestone-label-main">
                    {(tier.label || '').split('\n+ ')[0]}
                  </div>
                  {tier.sub_label
                    ? <div class="cartmax-milestone-sub-label">{tier.sub_label}</div>
                    : null
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Render: Ribbon ────────────────────────────────────────

  renderRibbon() {
    var result = this.state.evalResult;
    if (!result || !result.ribbon_message) return null;
    return (
      <div id="cartmax-ribbon" class="cartmax-ribbon">
        {result.ribbon_message}
      </div>
    );
  }

  // ── Variant switcher ──────────────────────────────────────

  async _fetchVariantData(item) {
    var productId = String(item.product_id);
    if (this._variantCache[productId]) return this._variantCache[productId];

    var handle = null;
    if (item.url) {
      var parts = item.url.split('/products/');
      if (parts[1]) handle = parts[1].split('?')[0];
    }
    if (!handle) return null;

    try {
      var res = await fetch('/products/' + handle + '.js');
      var data = await res.json();
      var variants = (data.variants || []).map(function (v) {
        return { id: v.id, title: v.title, available: v.available };
      });
      this._variantCache[productId] = variants;
      return variants;
    } catch (err) {
      console.error('[cartx] Failed to fetch variants:', err);
      return null;
    }
  }

  async handleVariantToggle(key, item) {
    var isOpen = this.state.variantOpen[key];
    var nextOpen = Object.assign({}, this.state.variantOpen);

    if (isOpen) {
      delete nextOpen[key];
      this.setState({ variantOpen: nextOpen });
      return;
    }

    nextOpen[key] = true;
    var productId = String(item.product_id);

    if (!this._variantCache[productId]) {
      var nextLoading = Object.assign({}, this.state.variantLoading, { [key]: true });
      this.setState({ variantOpen: nextOpen, variantLoading: nextLoading });
      await this._fetchVariantData(item);
      var clearLoading = Object.assign({}, this.state.variantLoading);
      delete clearLoading[key];
      this.setState({ variantLoading: clearLoading });
    } else {
      this.setState({ variantOpen: nextOpen });
    }
  }

  async handleVariantSwitch(item, newVariantId) {
    var key = item.key;
    var qty = item.quantity;

    var nextOpen = Object.assign({}, this.state.variantOpen);
    delete nextOpen[key];

    if (String(item.variant_id) === String(newVariantId)) {
      this.setState({ variantOpen: nextOpen });
      return;
    }

    var updating = Object.assign({}, this.state.updating, { [key]: true });
    this.setState({ variantOpen: nextOpen, updating: updating });
    this._startProcessingTimeout();

    try {
      await internalFetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: key, quantity: 0 }),
      });
      await internalFetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(newVariantId), quantity: qty }),
      });
      var cart = await fetchCart();
      this._currency = cart.currency || this._currency;
      window.dispatchEvent(new CustomEvent('cartmax:internal-reload', { detail: { cart: cart } }));
    } catch (err) {
      console.error('[cartx] Variant switch error:', err);
      var newUpdating = Object.assign({}, this.state.updating);
      delete newUpdating[key];
      this.setState({ updating: newUpdating });
      this.loadCart();
    }
  }

  // ── Render: Line Item ─────────────────────────────────────

  renderLineItem(item) {
    var isUpdating = this.state.updating[item.key];
    var isRemoving = this.state.removing[item.key];
    var displayQty = this.getDisplayQty(item);
    var isPending = this.state.pendingQty.hasOwnProperty(item.key);
    var curr = this._currency;
    var isFreebie = item.properties && item.properties['_freebie'] === 'true' && item.properties['_claimed'] !== 'true';
    var isClaimed = item.properties && (item.properties['_claimed'] === 'true' || item.properties['_cartmax_claim'] === 'true');
    var isVariantOpen = this.state.variantOpen[item.key];
    var isVariantLoading = this.state.variantLoading[item.key];
    var cachedVariants = this._variantCache[String(item.product_id)] || [];

    var showVariantSwitcher = this._layout.show_variant_switcher && item.variant_title && !isFreebie && !isClaimed;
    // Separate remove button: only when qty > 1 (at qty=1 trash is in the qty row)
    var showRemoveBtn = this._layout.show_remove_btn && displayQty > 1 && !isFreebie && !isClaimed;

    var cls = 'cartmax-line-item'
      + (isRemoving ? ' cartmax-line-removing' : '')
      + (isFreebie ? ' cartmax-line-freebie' : '');

    return (
      <div class={cls} key={item.key}>
        <div class="cartmax-line-image">
          {item.image
            ? <img src={resizeImage(item.image, 96)} alt={item.title} width="64" height="64" loading="lazy" />
            : <div class="cartmax-line-image-placeholder"><span class="visually-hidden">No image</span></div>
          }
        </div>
        <div class="cartmax-line-details">
          {this._layout.show_vendor && item.vendor ? <div class="cartmax-line-vendor">{item.vendor}</div> : null}
          <div class="cartmax-line-title-row">
            <div class="cartmax-line-title">{item.product_title}</div>
            {showRemoveBtn
              ? <button
                  class="cartmax-line-remove"
                  onClick={() => this.handleRemove(item.key)}
                  disabled={isUpdating || isRemoving}
                  aria-label={'Remove ' + item.product_title}
                ><IconTrash /></button>
              : null
            }
          </div>
          <div class="cartmax-line-price">
            {isFreebie && item.final_line_price === 0
              ? <span class="cartmax-gift-badge">FREE</span>
              : [
                  <span key="final">{formatMoney(item.final_line_price, curr)}</span>,
                  item.original_line_price > item.final_line_price
                    ? <span key="orig" class="cartmax-line-price-original">{formatMoney(item.original_line_price, curr)}</span>
                    : null,
                  !isClaimed && !isFreebie && item.original_line_price > item.final_line_price
                    ? <span key="savings" class="cartmax-line-savings-badge">
                        <IconDiscountBadge />
                        {Math.round((item.original_line_price - item.final_line_price) / item.original_line_price * 100)}% off
                      </span>
                    : null,
                ]
            }
          </div>
          {!isClaimed && !isFreebie && item.line_level_discount_allocations && item.line_level_discount_allocations.length > 0
            ? <div class="cartmax-line-discounts">
                {item.line_level_discount_allocations.map((d) => (
                  <span class="cartmax-line-discount-tag" key={d.discount_application.title}>
                    {d.discount_application.title}
                  </span>
                ))}
              </div>
            : null
          }
          {!isFreebie
            ? <div class="cartmax-line-actions">
                {showVariantSwitcher
                  ? <div class="cartmax-variant-wrap">
                      <button
                        class={'cartmax-variant-pill' + (isVariantOpen ? ' cartmax-variant-pill--open' : '')}
                        onClick={() => this.handleVariantToggle(item.key, item)}
                        disabled={isUpdating}
                        aria-haspopup="listbox"
                        aria-expanded={isVariantOpen ? 'true' : 'false'}
                      >
                        <span>{item.variant_title}</span>
                        {isVariantLoading
                          ? <span class="cartmax-variant-loading" aria-hidden="true" />
                          : <svg class="cartmax-variant-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>
                        }
                      </button>
                      {isVariantOpen && cachedVariants.length > 0
                        ? <div class="cartmax-variant-dropdown" role="listbox">
                            {cachedVariants.map((v) => {
                              var isCurrent = String(v.id) === String(item.variant_id);
                              return (
                                <button
                                  class={'cartmax-variant-option' + (isCurrent ? ' cartmax-variant-option--current' : '') + (!v.available ? ' cartmax-variant-option--oos' : '')}
                                  key={v.id}
                                  role="option"
                                  aria-selected={isCurrent ? 'true' : 'false'}
                                  disabled={!v.available || isUpdating}
                                  onClick={() => this.handleVariantSwitch(item, v.id)}
                                >
                                  <span>{v.title}</span>
                                  {isCurrent ? <IconCheck /> : null}
                                  {!v.available ? <span class="cartmax-variant-oos-label">Out of stock</span> : null}
                                </button>
                              );
                            })}
                          </div>
                        : null
                      }
                    </div>
                  : null
                }
                <div class="cartmax-qty-controls">
                  <button
                    class="cartmax-qty-btn"
                    onClick={() => displayQty <= 1 ? this.handleRemove(item.key) : this.queueQuantityChange(item.key, displayQty - 1)}
                    disabled={isUpdating || isRemoving}
                    aria-label={displayQty <= 1 ? ('Remove ' + item.product_title) : 'Decrease quantity'}
                  >{displayQty <= 1 ? <IconTrash /> : <IconMinus />}</button>
                  <span class={'cartmax-qty-value' + (isPending ? ' cartmax-qty-pending' : '')}>
                    {displayQty}
                  </span>
                  <button
                    class="cartmax-qty-btn"
                    onClick={() => this.queueQuantityChange(item.key, displayQty + 1)}
                    disabled={isUpdating}
                    aria-label="Increase quantity"
                  ><IconPlus /></button>
                </div>
              </div>
            : null
          }
        </div>
      </div>
    );
  }

  // ── Render: Loading skeleton ──────────────────────────────

  renderLoading() {
    return (
      <div class="cartmax-loading">
        {[0, 1, 2].map(function (i) {
          return (
            <div class="cartmax-skeleton-item" key={i}>
              <div class="cartmax-skeleton-img"><span class="visually-hidden">Loading</span></div>
              <div class="cartmax-skeleton-lines">
                <div class="cartmax-skeleton-line"><span class="visually-hidden">Loading</span></div>
                <div class="cartmax-skeleton-line"><span class="visually-hidden">Loading</span></div>
                <div class="cartmax-skeleton-line"><span class="visually-hidden">Loading</span></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Render: Empty state ───────────────────────────────────

  renderEmpty() {
    var self = this;
    var iconUrl = this._layout.empty_icon_url;
    var iconSize = this._layout.empty_icon_size || 'medium';
    var iconColor = this._layout.empty_icon_color;
    var iconStyle = iconColor ? { color: iconColor } : undefined;
    var sizeClass = 'cartmax-empty-icon cartmax-empty-icon--' + iconSize;

    return (
      <div class="cartmax-empty">
        <div class={sizeClass} style={iconStyle}>
          {iconUrl
            ? <img src={iconUrl} alt="" aria-hidden="true" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            : <IconBag />
          }
        </div>
        <div class="cartmax-empty-text-group">
          <p class="cartmax-empty-text">{this._text.empty_title}</p>
          <p class="cartmax-empty-subtitle">{this._text.empty_subtitle}</p>
        </div>
        {this._text.empty_button ? (
          <button class="cartmax-empty-btn" onClick={function () {
            if (self._text.continue_shopping_url) { window.location.href = self._text.continue_shopping_url; }
            else { self.close(); }
          }}>{this._text.empty_button}</button>
        ) : null}
      </div>
    );
  }

  // ── Claim Gifts (button-level optimistic, line pessimistic) ─

  _showClaimError(key, message) {
    if (this._errorTimers[key]) clearTimeout(this._errorTimers[key]);
    var nextError = Object.assign({}, this.state.claimError);
    nextError[key] = message;
    this.setState({ claimError: nextError });
    this._errorTimers[key] = setTimeout(() => {
      delete this._errorTimers[key];
      var clear = Object.assign({}, this.state.claimError);
      delete clear[key];
      this.setState({ claimError: clear });
    }, INLINE_ERROR_HOLD_MS);
  }

  _clearClaimError(key) {
    if (this._errorTimers[key]) {
      clearTimeout(this._errorTimers[key]);
      delete this._errorTimers[key];
    }
    if (this.state.claimError[key]) {
      var clear = Object.assign({}, this.state.claimError);
      delete clear[key];
      this.setState({ claimError: clear });
    }
  }

  async handleClaimAdd(variantId, claimId) {
    var key = 'claim_' + variantId;

    // Button-level optimistic: card flips to "Claimed ✓" immediately.
    // No optimistic line in the cart — the line materialises on reconcile.
    this._clearClaimError(key);
    this.setState({
      claimed: Object.assign({}, this.state.claimed, { [key]: true }),
      updating: Object.assign({}, this.state.updating, { [key]: true }),
    });

    try {
      await internalFetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Number(variantId),
          quantity: 1,
          properties: { _freebie: 'true', _cartmax_claim: 'true', _claimed: 'true', _offer_id: claimId },
        }),
      });
      var cart = await fetchCart();
      this._currency = cart.currency || this._currency;
      this.setState({ cart: cart });
      updateCartCount(cart.item_count);
      window.dispatchEvent(new CustomEvent('cartmax:cart-changed', { detail: { cart: cart } }));
      tracker.track(ANALYTICS_EVENTS.GIFT_CLAIMED, {
        promotion_id: claimId,
        promotion_type: 'claim-gift',
        variant_id: String(variantId),
        cart_total: cart.total_price,
        item_count: cart.item_count,
      });
    } catch (err) {
      // Rollback the button — claim state revert + inline error.
      var nextClaimed = Object.assign({}, this.state.claimed);
      delete nextClaimed[key];
      this.setState({ claimed: nextClaimed });
      this._showClaimError(key, 'Out of stock');
      console.error('[cartx] Claim add error:', err);
    } finally {
      var newUpdating = Object.assign({}, this.state.updating);
      delete newUpdating[key];
      this.setState({ updating: newUpdating });
    }
  }

  async handleClaimRemove(variantId) {
    var cart = this.state.cart;
    if (!cart) return;
    var line = cart.items.find(function (i) {
      return String(i.variant_id) === String(variantId);
    });
    if (!line) return;
    // Clear any lingering button-optimistic "Claimed ✓" state so it doesn't
    // flash back on next render when inCart flips false.
    var nextClaimed = Object.assign({}, this.state.claimed);
    delete nextClaimed['claim_' + variantId];
    delete nextClaimed['offer_' + variantId];
    this.setState({ claimed: nextClaimed });
    this.handleRemove(line.key);
  }

  // Display-mode offer: customer manually adds the gift from a card.
  // Button-level optimistic (same pattern as handleClaimAdd) — the cart
  // line itself stays pessimistic to avoid blink-in/blink-out on
  // inventory rejection.
  async handleOfferDisplayAdd(variantId, offerId, quantity) {
    var key = 'offer_' + variantId;

    this._clearClaimError(key);
    this.setState({
      claimed: Object.assign({}, this.state.claimed, { [key]: true }),
      updating: Object.assign({}, this.state.updating, { [key]: true }),
    });

    try {
      await internalFetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Number(variantId),
          quantity: quantity || 1,
          properties: {
            _freebie: 'true',
            _offer_id: offerId,
            _acquired_on_page: window.location.pathname,
          },
        }),
      });
      var cart = await fetchCart();
      this._currency = cart.currency || this._currency;
      this.setState({ cart: cart });
      updateCartCount(cart.item_count);
      window.dispatchEvent(new CustomEvent('cartmax:cart-changed', { detail: { cart: cart } }));
    } catch (err) {
      var nextClaimed = Object.assign({}, this.state.claimed);
      delete nextClaimed[key];
      this.setState({ claimed: nextClaimed });
      this._showClaimError(key, 'Out of stock');
      console.error('[cartx] Offer display add error:', err);
    } finally {
      var newUpdating = Object.assign({}, this.state.updating);
      delete newUpdating[key];
      this.setState({ updating: newUpdating });
    }
  }

  renderOfferDisplays() {
    var result = this.state.evalResult;
    if (!result) return null;
    var groups = result.offer_displays || [];
    if (groups.length === 0) return null;

    var self = this;
    var heading = this._text.offer_cards_heading || 'Pick your free gift';

    return (
      <div class="cartmax-claims cartmax-offer-cards">
        <div class="cartmax-claims-heading">{heading}</div>
        <div class="cartmax-claims-scroll">
          {groups.map(function (group) {
            return (
              <div
                class="cartmax-offer-group"
                key={'group:' + group.offer_id}
                data-cartmax-promo-id={group.offer_id}
                data-cartmax-promo-type="offer"
                ref={function (el) { self._observePromo(el); }}
              >
                {(group.gifts || []).map(function (g) {
                  var vid = String(g.variant_id);
                  if (vid.startsWith('gid://')) vid = vid.split('/').pop();
                  var btnKey = 'offer_' + vid;
                  var isAdding = self.state.updating[btnKey];
                  var isClaimedOptimistic = self.state.claimed[btnKey];
                  var claimErr = self.state.claimError[btnKey];
                  var inCart = g.in_cart;
                  var showClaimedBtn = isClaimedOptimistic && !inCart;
                  return (
                    <div class={'cartmax-claim-card' + (inCart ? ' cartmax-claim-card--in-cart' : '')} key={group.offer_id + ':' + vid}>
                      {g.image
                        ? <img class="cartmax-claim-img" src={resizeImage(g.image, 96)} alt={g.title} loading="lazy" />
                        : <div class="cartmax-claim-img-placeholder"><span class="visually-hidden">No image</span></div>
                      }
                      <div class="cartmax-claim-info">
                        {g.title ? <div class="cartmax-claim-title">{g.title}</div> : null}
                        {inCart
                          ? <button
                              class="cartmax-claim-btn cartmax-claim-btn--remove"
                              onClick={function () { self.handleClaimRemove(vid); }}
                            >Remove</button>
                          : showClaimedBtn
                            ? <button
                                class="cartmax-claim-btn cartmax-claim-btn--claimed"
                                disabled
                              ><IconCheck /> Claimed</button>
                            : <button
                                class="cartmax-claim-btn cartmax-claim-btn--add"
                                onClick={function () { self.handleOfferDisplayAdd(vid, group.offer_id, group.quantity_per_variant); }}
                                disabled={isAdding || !g.available}
                              >{isAdding ? 'Adding...' : (!g.available ? 'Unavailable' : 'Add')}</button>
                        }
                        {claimErr ? <div class="cartmax-claim-error">{claimErr}</div> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  renderClaimGifts() {
    var result = this.state.evalResult;
    if (!result || !result.claim_gifts) return null;
    var cg = result.claim_gifts;
    if (!cg.applicable_to_current_page) return null;
    if (cg.threshold_remaining) return null;

    var allGifts = cg.gifts || [];
    if (allGifts.length === 0) return null;

    var self = this;
    var cart = this.state.cart;
    var maxClaims = cg.max_claims || allGifts.length;

    function isInCart(vid) {
      if (!cart || !cart.items) return false;
      return cart.items.some(function (item) {
        return String(item.variant_id) === String(vid);
      });
    }

    var gifts = allGifts;

    var cartClaimedCount = 0;
    if (cart && cart.items) {
      cart.items.forEach(function (item) {
        if (item.properties && (item.properties['_claimed'] === 'true' || item.properties['_cartmax_claim'] === 'true')) {
          cartClaimedCount++;
        }
      });
    }
    var limitReached = cartClaimedCount >= maxClaims;

    return (
      <div
        class="cartmax-claims"
        data-cartmax-promo-id={cg._rule_id}
        data-cartmax-promo-type="claim-gift"
        ref={function (el) { self._observePromo(el); }}
      >
        <div class="cartmax-claims-heading">{cg.section_heading}</div>
        <div class="cartmax-claims-scroll">
          {gifts.map(function (g) {
            var vid = String(g.variant_id);
            if (vid.startsWith('gid://')) vid = vid.split('/').pop();
            var btnKey = 'claim_' + vid;
            var isClaiming = self.state.updating[btnKey];
            var isClaimedOptimistic = self.state.claimed[btnKey];
            var claimErr = self.state.claimError[btnKey];
            var inCart = g.in_cart || isInCart(vid);
            var showClaimedBtn = isClaimedOptimistic && !inCart;
            return (
              <div class={'cartmax-claim-card' + (inCart ? ' cartmax-claim-card--in-cart' : '')} key={vid}>
                {g.image
                  ? <img class="cartmax-claim-img" src={resizeImage(g.image, 96)} alt={g.title} loading="lazy" />
                  : <div class="cartmax-claim-img-placeholder"><span class="visually-hidden">No image</span></div>
                }
                <div class="cartmax-claim-info">
                  {g.title ? <div class="cartmax-claim-title">{g.title}</div> : null}
                  {inCart
                    ? <button
                        class="cartmax-claim-btn cartmax-claim-btn--remove"
                        onClick={function () { self.handleClaimRemove(vid); }}
                      >Remove</button>
                    : showClaimedBtn
                      ? <button
                          class="cartmax-claim-btn cartmax-claim-btn--claimed"
                          disabled
                        ><IconCheck /> Claimed</button>
                      : <button
                          class="cartmax-claim-btn cartmax-claim-btn--add"
                          onClick={function () { self.handleClaimAdd(vid, cg._rule_id); }}
                          disabled={isClaiming || !g.available || limitReached}
                        >{isClaiming ? 'Adding...' : (!g.available ? 'Unavailable' : (limitReached ? 'Limit reached' : 'Claim gift'))}</button>
                  }
                  {claimErr ? <div class="cartmax-claim-error">{claimErr}</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Coupons ────────────────────────────────────────────────

  getAppliedCodes() {
    var cart = this.state.cart;
    if (!cart) return [];
    var codes = [];
    (cart.cart_level_discount_applications || []).forEach(function (d) {
      if (d.title) codes.push(d.title);
    });
    (cart.items || []).forEach(function (item) {
      (item.line_level_discount_allocations || []).forEach(function (a) {
        if (a.discount_application && a.discount_application.title) {
          codes.push(a.discount_application.title);
        }
      });
    });
    return codes.filter(function (c, i, arr) { return arr.indexOf(c) === i; });
  }

  async handleCouponApply(code) {
    if (!code || !code.trim()) return;
    this.setState({ couponLoading: true, couponError: null });
    try {
      var currentCodes = this.getAppliedCodes();
      var newCode = code.trim();
      if (!currentCodes.some(function (c) { return c.toUpperCase() === newCode.toUpperCase(); })) {
        currentCodes.push(newCode);
      }
      var discountPayload = currentCodes.join(',');

      await cartUpdateAll({ discount: discountPayload });
      var cart = await fetchCart();

      var codeUpper = newCode.toUpperCase();
      var applied = (cart.cart_level_discount_applications || []).some(function (d) {
        return d.title && d.title.toUpperCase() === codeUpper;
      });
      if (!applied) {
        applied = (cart.items || []).some(function (item) {
          return (item.line_level_discount_allocations || []).some(function (a) {
            return a.discount_application && a.discount_application.title &&
              a.discount_application.title.toUpperCase() === codeUpper;
          });
        });
      }

      this._currency = cart.currency || this._currency;
      this.setState({
        cart: cart,
        couponLoading: false,
        couponError: applied ? null : 'Invalid or inapplicable code',
        couponInput: applied ? '' : this.state.couponInput,
        couponPanelOpen: applied ? false : this.state.couponPanelOpen,
      });
      updateCartCount(cart.item_count);
      if (applied) window.dispatchEvent(new CustomEvent('cartmax:cart-action', { detail: { cart: cart } }));

      tracker.track(
        applied ? ANALYTICS_EVENTS.COUPON_APPLIED : ANALYTICS_EVENTS.COUPON_REJECTED,
        {
          promotion_type: 'coupon',
          code: newCode,
          reason: applied ? null : 'not_applicable',
          cart_total: cart.total_price,
          item_count: cart.item_count,
        },
      );
    } catch (err) {
      this.setState({ couponLoading: false, couponError: 'Failed to apply coupon' });
      tracker.track(ANALYTICS_EVENTS.COUPON_REJECTED, {
        promotion_type: 'coupon',
        code: (code || '').trim(),
        reason: 'request_failed',
      });
    }
  }

  async handleCouponRemove(codeToRemove) {
    var snapshot = this.state.cart;
    this.setState({ couponLoading: true });

    // Optimistic: drop the chip from cart_level_discount_applications.
    // Totals stay where they are until reconcile — re-running the merchant's
    // discount engine client-side isn't possible. Acceptable: the chip
    // disappearing is the visible feedback.
    if (snapshot) dispatchOptimistic(simulateCouponRemove(snapshot, codeToRemove));

    try {
      var currentCodes = this.getAppliedCodes();
      var removeUpper = (codeToRemove || '').toUpperCase();
      var remaining = currentCodes.filter(function (c) { return c.toUpperCase() !== removeUpper; });
      var discountPayload = remaining.length > 0 ? remaining.join(',') : '';

      await cartUpdateAll({ discount: discountPayload });
      var cart = await fetchCart();

      this._currency = cart.currency || this._currency;
      this.setState({ cart: cart, couponLoading: false });
      updateCartCount(cart.item_count);
      window.dispatchEvent(new CustomEvent('cartmax:cart-action', { detail: { cart: cart } }));
    } catch (err) {
      // Rollback the chip.
      if (snapshot) dispatchOptimistic(snapshot);
      this.setState({ couponLoading: false });
    }
  }

  getAppliedDiscounts() {
    var cart = this.state.cart;
    if (!cart) return [];
    var codes = [];
    (cart.cart_level_discount_applications || []).forEach(function (d) {
      if (d.title && d.type === 'discount_code') {
        codes.push({ code: d.title, amount: d.total_allocated_amount || 0 });
      }
    });
    return codes;
  }

  renderCoupons() {
    var self = this;
    var isLoading = this.state.couponLoading;
    var appliedDiscounts = this.getAppliedDiscounts();
    var showPanel = this.state.couponPanelOpen;
    var cart = this.state.cart;
    var cartQty = cart ? (cart.item_count || 0) : 0;
    var cartTotal = cart ? (cart.total_price || 0) / 100 : 0;
    var coupons = this._coupons.filter(function (c) {
      var minQty = Number(c.trigger_qty) || 0;
      var minPrice = Number(c.trigger_price) || 0;
      if (minQty > 0 && cartQty < minQty) return false;
      if (minPrice > 0 && cartTotal < minPrice) return false;
      return true;
    });

    return (
      <div class="cartmax-coupons">

        {/* Applied coupon banners — one per applied code, stacked above block */}
        {appliedDiscounts.map(function (d) {
          return (
            <div class="cartmax-applied-coupon-banner" key={d.code}>
              <div class="cartmax-applied-coupon-card">
                <div class="cartmax-applied-coupon-left">
                  <span class="cartmax-applied-label">Applied Coupon</span>
                  <span class="cartmax-applied-code">{d.code}</span>
                </div>
                <button
                  class="cartmax-applied-remove"
                  onClick={function () { self.handleCouponRemove(d.code); }}
                  disabled={isLoading}
                  aria-label={'Remove ' + d.code}
                >REMOVE</button>
              </div>
            </div>
          );
        })}

        {/* Discount block — pink wrapper, input row + horizontal card scroll */}
        <div class="cartmax-discount-block">
          <div class="cartmax-discount-input-row">
            <input
              class="cartmax-discount-input"
              type="text"
              placeholder="Apply Coupon"
              value={self.state.couponInput || ''}
              onInput={function (e) { self.setState({ couponInput: e.target.value, couponError: null }); }}
              onKeyDown={function (e) { if (e.key === 'Enter') self.handleCouponApply(self.state.couponInput); }}
              disabled={isLoading}
            />
            <button
              class="cartmax-discount-submit"
              onClick={function () { self.handleCouponApply(self.state.couponInput); }}
              disabled={isLoading || !(self.state.couponInput || '').trim()}
              aria-label="Apply coupon"
            ><IconChevronRight /></button>
            <span class="cartmax-discount-divider" />
            <button
              class="cartmax-discount-viewall"
              onClick={function () { self.setState({ couponPanelOpen: true }); }}
            >View All</button>
          </div>
          {self.state.couponError
            ? <div class="cartmax-coupon-error">{self.state.couponError}</div>
            : null
          }
          <div class="cartmax-discount-cards">
            {coupons.map(function (c) {
              var isApplied = appliedDiscounts.some(function (d) { return d.code === c.code; });
              return (
                <div class="cartmax-discount-card" key={c.code}>
                  <div class="cartmax-discount-card-accent">
                    <span>{c.accent}</span>
                  </div>
                  <div class="cartmax-discount-card-info">
                    <span class="cartmax-discount-card-code">{c.code}</span>
                    <span class="cartmax-discount-card-savings">{c.savings}</span>
                  </div>
                  <button
                    class={'cartmax-discount-card-btn' + (isApplied ? ' cartmax-discount-card-btn--applied' : '')}
                    onClick={function () { self.handleCouponApply(c.code); }}
                    disabled={isLoading}
                  >{isApplied ? 'Applied' : 'Apply'}</button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Offers & Coupons panel — slides in from right */}
        <div class={'cartmax-offers-panel' + (showPanel ? ' cartmax-offers-panel--open' : '')}>
          <div class="cartmax-offers-panel-header">
            <button
              class="cartmax-offers-back"
              onClick={function () { self.setState({ couponPanelOpen: false }); }}
              aria-label="Back to cart"
            ><IconChevronLeft /></button>
            <span class="cartmax-offers-title">Offers & Coupons</span>
          </div>
          <div class="cartmax-offers-body">
            <span class="cartmax-offers-label">Available Coupons</span>
            <div class="cartmax-offers-cards">
              {coupons.map(function (c) {
                var isApplied = appliedDiscounts.some(function (d) { return d.code === c.code; });
                return (
                  <div class="cartmax-offers-card" key={c.code}>
                    <div class="cartmax-offers-card-accent">
                      <span>{c.accent}</span>
                    </div>
                    <div class="cartmax-offers-card-info">
                      <span class="cartmax-offers-card-code">{c.code}</span>
                      <span class="cartmax-offers-card-savings">{c.savings}</span>
                    </div>
                    <button
                      class={'cartmax-offers-card-btn' + (isApplied ? ' cartmax-offers-card-btn--applied' : '')}
                      onClick={function () { self.handleCouponApply(c.code); }}
                      disabled={isLoading}
                    >{isApplied ? 'Applied' : 'Apply'}</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    );
  }

  // ── Render: Upsells ────────────────────────────────────────

  _showUpsellError(message) {
    if (this._upsellErrorTimer) clearTimeout(this._upsellErrorTimer);
    this.setState({ upsellError: message });
    this._upsellErrorTimer = setTimeout(() => {
      this._upsellErrorTimer = null;
      this.setState({ upsellError: null });
    }, INLINE_ERROR_HOLD_MS);
  }

  // Line-level optimistic add. Customer explicitly chose a paid item;
  // out-of-stock is an intuitive failure mode worth the line-blink risk.
  async handleUpsellAdd(variantId, productMeta) {
    var key = 'upsell_' + variantId;
    var snapshot = this.state.cart;

    this.setState({ updating: Object.assign({}, this.state.updating, { [key]: true }) });

    if (productMeta && snapshot) {
      var unitPriceCents = Math.round(Number(productMeta.price || 0) * 100);
      var optimisticItem = {
        key: 'pending_upsell_' + variantId + '_' + Date.now(),
        variant_id: Number(variantId),
        quantity: 1,
        price: unitPriceCents,
        line_price: unitPriceCents,
        final_line_price: unitPriceCents,
        original_line_price: unitPriceCents,
        product_title: productMeta.title || '',
        title: productMeta.title || '',
        image: productMeta.image || '',
        variant_title: productMeta.variant_title || '',
        properties: {},
        line_level_discount_allocations: [],
      };
      dispatchOptimistic(simulateAdd(snapshot, optimisticItem));
    }

    try {
      await internalFetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(variantId), quantity: 1 }),
      });
      var cart = await fetchCart();
      this._currency = cart.currency || this._currency;
      window.dispatchEvent(new CustomEvent('cartmax:internal-reload', { detail: { cart: cart } }));
      window.dispatchEvent(new CustomEvent('cartmax:cart-changed', { detail: { cart: cart } }));
      tracker.track(ANALYTICS_EVENTS.UPSELL_ADDED, {
        promotion_type: 'upsell',
        variant_id: String(variantId),
        cart_total: cart.total_price,
        item_count: cart.item_count,
      });
    } catch (err) {
      // Roll back optimistic line.
      if (snapshot) dispatchOptimistic(snapshot);
      this._showUpsellError('Could not add — out of stock or unavailable.');
      console.error('[cartx] Upsell add error:', err);
    } finally {
      var newUpdating = Object.assign({}, this.state.updating);
      delete newUpdating[key];
      this.setState({ updating: newUpdating });
    }
  }

  renderUpsells() {
    var result = this.state.evalResult;
    if (!result || !result.upsells || !result.upsells.enabled) return null;
    var upsells = result.upsells;
    var products = upsells.products || [];
    if (products.length === 0) return null;

    var cart = this.state.cart;
    var isEmpty = !cart || !cart.items || cart.items.length === 0;
    if (isEmpty && this._upsells.show_on_empty !== 'always') return null;

    var cartVariantIds = (cart && cart.items || []).map(function (i) { return String(i.variant_id); });
    var filtered = products.filter(function (p) {
      var vid = String(p.variant_id);
      if (vid.startsWith('gid://')) vid = vid.split('/').pop();
      return cartVariantIds.indexOf(vid) === -1;
    });
    if (filtered.length === 0) return null;

    var curr = this._currency;
    var self = this;
    var u = this._upsells;
    var layoutClass = 'cartmax-upsells--' + (u.card_layout || 'horizontal');
    var sizeClass = 'cartmax-upsell-card--' + (u.card_size || 'medium');
    var headingText = u.heading || 'YOU MAY ALSO LIKE';
    var btnText = u.btn_text || 'ADD TO CART';
    var imgPx = { small: 130, medium: 180, large: 230 }[u.card_size] || 180;

    return (
      <div class={'cartmax-upsells ' + layoutClass}>
        <div class="cartmax-upsells-heading" style={{ justifyContent: u.heading_position === 'center' ? 'center' : 'flex-start' }}>{headingText}</div>
        {this.state.upsellError
          ? <div class="cartmax-upsell-error">{this.state.upsellError}</div>
          : null
        }
        <div class="cartmax-upsells-scroll">
          {filtered.map(function (p) {
            var vid = String(p.variant_id);
            if (vid.startsWith('gid://')) vid = vid.split('/').pop();
            var isAdding = self.state.updating['upsell_' + vid];
            var productMeta = {
              title: p.title,
              image: p.image_url,
              price: p.price,
            };
            return (
              <div class={'cartmax-upsell-card ' + sizeClass} key={p.product_id}>
                {p.image_url
                  ? <img class="cartmax-upsell-img" src={resizeImage(p.image_url, imgPx)} alt={p.title} loading="lazy" />
                  : <div class="cartmax-upsell-img-placeholder"><span class="visually-hidden">No image</span></div>
                }
                <div class="cartmax-upsell-info">
                  <div class="cartmax-upsell-title">{p.title}</div>
                  <div class="cartmax-upsell-price">
                    <span class="cartmax-upsell-sale">{formatMoney(Number(p.price) * 100, curr)}</span>
                    {(u.show_compare_price && p.compare_at_price)
                      ? <span class="cartmax-upsell-compare">{formatMoney(Number(p.compare_at_price) * 100, curr)}</span>
                      : null
                    }
                  </div>
                  <button
                    class="cartmax-upsell-add"
                    onClick={function () { self.handleUpsellAdd(vid, productMeta); }}
                    disabled={isAdding}
                  >{isAdding ? 'Adding...' : btnText}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Render: Footer (totals + checkout) ────────────────────

  renderFooter() {
    var cart = this.state.cart;
    var curr = this._currency;
    var savings = Number(this.state.savings) || 0;
    var savingsParts = (savings > 0 && this._text.savings_label)
      ? this._text.savings_label.split('{amount}')
      : null;
    var trustMsg = this._text.checkout_trust_message || '';

    return (
      <div class="cartmax-footer">
        {savingsParts ? (
          <div class="cartmax-footer-savings">
            <span class="cartmax-footer-savings-icon"><IconSparkle /></span>
            <span>{savingsParts[0]}</span>
            <span class="cartmax-footer-savings-amount">{formatMoney(savings, curr)}</span>
            <span>{savingsParts[1] || ''}</span>
            <span class="cartmax-footer-savings-icon"><IconSparkle /></span>
          </div>
        ) : null}
        <div class="cartmax-footer-checkout">
          <div class="cartmax-footer-price">
            <span class="cartmax-footer-price-amount">{formatMoney(cart.total_price, curr)}</span>
            <button
              class="cartmax-price-breakup-link"
              onClick={() => this.setState({ priceBreakupOpen: true })}
            >VIEW PRICE BREAKUP</button>
          </div>
          <a
            class={'cartmax-checkout-btn' + (this.state.checkoutWaiting ? ' cartmax-checkout-waiting' : '')}
            href="/checkout"
            onClick={(e) => {
              tracker.persistSessionCookie();
              var isProcessing = Object.keys(this.state.updating).length > 0;
              if (isProcessing || this.state.checkoutWaiting) {
                e.preventDefault();
                if (this.state.checkoutWaiting) return;
                this.setState({ checkoutWaiting: true });
                waitForEvaluate().then(() => {
                  this.setState({ checkoutWaiting: false });
                  window.location.href = '/checkout';
                });
              }
            }}
          >
            <span>{this.state.checkoutWaiting ? 'Preparing...' : this._text.checkout_button}</span>
            {this._layout.show_payment_icons && !this.state.checkoutWaiting ? (
              <span class="cartmax-payment-methods"><IconPaymentMethods /></span>
            ) : null}
          </a>
        </div>
        {trustMsg ? (
          <div class="cartmax-footer-trust">
            <IconLock />
            <span>{trustMsg}</span>
            <IconLock />
          </div>
        ) : null}
      </div>
    );
  }

  // ── Render: Price Breakup Panel ───────────────────────────

  renderPriceBreakup() {
    var cart = this.state.cart;
    var curr = this._currency;
    var totalMRP = cart.items_subtotal_price;
    var discountTotal = cart.total_discount || 0;

    return (
      <div class="cartmax-pb-backdrop" onClick={() => this.setState({ priceBreakupOpen: false })}>
        <div class="cartmax-price-breakup-panel" onClick={(e) => e.stopPropagation()}>
          <div class="cartmax-price-breakup-header">
            <span>Price Break Up</span>
            <button
              class="cartmax-price-breakup-close"
              aria-label="Close"
              onClick={() => this.setState({ priceBreakupOpen: false })}
            >
              <IconClose />
            </button>
          </div>
          <div class="cartmax-pb-divider" />
          <div class="cartmax-price-breakup-rows">
            <div class="cartmax-pb-row">
              <span class="cartmax-pb-label">Total</span>
              <span class="cartmax-pb-amount">{formatMoney(totalMRP, curr)}</span>
            </div>
            {discountTotal > 0 ? (
              <div class="cartmax-pb-row">
                <span class="cartmax-pb-label">Coupon Discount</span>
                <span class="cartmax-pb-amount cartmax-pb-discount">{'-'}{formatMoney(discountTotal, curr)}</span>
              </div>
            ) : null}
            <div class="cartmax-pb-row">
              <span class="cartmax-pb-label">Delivery Fee</span>
              <span class="cartmax-pb-amount">{formatMoney(0, curr)}</span>
            </div>
          </div>
          <div class="cartmax-price-breakup-total">
            <span>Total Amount</span>
            <span>{formatMoney(cart.total_price, curr)}</span>
          </div>
        </div>
      </div>
    );
  }

    // ── Main render ───────────────────────────────────────────

  render(props, { visible, open, cart, loading }) {
    var liveRegion = (
      <div
        id="cartmax-live-region"
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
      />
    );

    if (!visible) {
      return <div class="cartmax-wrapper">{liveRegion}</div>;
    }

    var isEmpty = !loading && cart && cart.items && cart.items.length === 0;
    var hasItems = !loading && cart && cart.items && cart.items.length > 0;
    var count = cart ? cart.item_count : 0;

    // Build overlay classes from settings
    var overlayClass = 'cartmax-overlay';
    if (open) overlayClass += ' cartmax-open';
    if (this._layout.drawer_position === 'left') overlayClass += ' cartmax-pos-left';
    if (this._shape.button_style === 'outline') overlayClass += ' cartmax-btn-outline';
    if (this._layout.image_style === 'square') overlayClass += ' cartmax-img-square';
    else if (this._layout.image_style === 'circle') overlayClass += ' cartmax-img-circle';
    if (this._layout.qty_style === 'minimal') overlayClass += ' cartmax-qty-minimal';
    if (this._behavior.animation_style === 'fade') overlayClass += ' cartmax-anim-fade';
    else if (this._behavior.animation_style === 'none') overlayClass += ' cartmax-anim-none';

    var sec = this._sections;

    return (
      <div class="cartmax-wrapper">
        {liveRegion}
        <div class={overlayClass} onClick={this.handleOverlayClick}>
          <div
            class="cartmax-drawer"
            ref={(el) => { this._drawerRef = el; }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
          >
            {/* Announcement bar */}
            {this.renderAnnouncementBar()}

            {/* Header */}
            <div class="cartmax-header">
              <span class="cartmax-title">
                {this._text.cart_title}
                {count > 0 ? <span class="cartmax-header-count">{count}</span> : null}
              </span>
              <button class="cartmax-close" onClick={this.close} aria-label="Close cart">
                <IconClose />
              </button>
            </div>

            {/* Gift unavailable notice */}
            {this.state.unavailableGifts.length > 0
              ? <div class="cartmax-gift-unavailable">A gift product is currently unavailable</div>
              : null
            }

            {/* Body */}
            <div class="cartmax-body">
              {/* Progress bar */}
              {hasItems && sec.show_progress_bar ? this.renderProgressBar() : null}

              {/* Claim gifts */}
              {hasItems && sec.show_claim_gifts ? this.renderClaimGifts() : null}

              {/* Display-mode offer cards */}
              {hasItems && sec.show_offer_cards ? this.renderOfferDisplays() : null}

              {loading
                ? this.renderLoading()
                : isEmpty
                  ? this.renderEmpty()
                  : hasItems
                    ? this._displayItems().map((item) => this.renderLineItem(item))
                    : null
              }
              {hasItems && sec.show_coupons ? this.renderCoupons() : null}
              {hasItems && sec.show_upsells ? this.renderUpsells() : null}
            </div>

            {/* Ribbon */}
            {hasItems && sec.show_ribbon ? this.renderRibbon() : null}

            {/* Upsells pinned to bottom on empty cart */}
            {isEmpty && sec.show_upsells ? this.renderUpsells() : null}

            {/* Footer */}
            {hasItems ? this.renderFooter() : null}

            {/* Price Breakup Panel — slides up over drawer content */}
            {this.state.priceBreakupOpen ? this.renderPriceBreakup() : null}
          </div>
        </div>
      </div>
    );
  }
}
