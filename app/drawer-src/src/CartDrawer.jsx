/* eslint-disable */
import { h, Component, Fragment } from 'preact';
import { fetchCart, cartUpdateAll, internalFetch, formatMoney, resizeImage, updateCartCount, trapFocus, applyDrawerSettings, dispatchOptimistic, simulateAdd, normalizeVariantId, hasFreebieMarker, showsQuantitySelector, giftChargedAmount, normalizeSectionOrder, fillTemplate, formatQty, discountPercent, splitCoupons, savingsForCode } from './helpers';
import { fireConfetti, setConfettiLottieUrl } from './confetti';
import { waitForEvaluate, callEvaluate, applyOptimisticGifts, buildPendingGiftLine, ensureCartxAttribute, ensureDrawerAttribute, localGiftDelta, giftIntendedQuantity, dispatchLocalBar } from './evaluate';
import { isGraphqlCartEnabled, isStorefrontReady, fetchProductAvailability } from './storefront-cart';
import { pickRecommendations, selectUpsells } from '../../lib/upsell-recs.js';
import { initStore as gqlInitStore, subscribe as gqlSubscribe, getOptimisticCart as gqlGetCart, changeQuantity as gqlChangeQuantity, removeLine as gqlRemoveLine, addLine as gqlAddLine, applyDiscountCode as gqlApplyCoupon, removeDiscountCode as gqlRemoveCoupon, whenSettled as gqlWhenSettled } from './cart-store';
import { isAjaxCartStoreEnabled, subscribe as ajaxSubscribe, getOptimisticCart as ajaxGetCart, init as ajaxInit, reconcileFromServer as ajaxReconcile, addLine as ajaxAddLine, changeQuantity as ajaxChangeQty, removeLine as ajaxRemoveLine, whenSettled as ajaxWhenSettled, cartHasDiscounts } from './ajax-cart-store';
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

function IconInfo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
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

// `hasFreebieMarker` and `showsQuantitySelector` (the gift-line + quantity-
// selector policy) live in ./helpers so they can be unit-tested without loading
// the whole Preact component.

// ── CartDrawer Component ────────────────────────────────────

export default class CartDrawer extends Component {
  constructor() {
    super();
    this.state = {
      visible: false,
      open: false,
      styled: false,     // true once merchant styling is applied — gates reveal so the drawer never paints with default styling first
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
    this._actionBuffer = {};              // key -> qty; coalesces rapid qty/remove clicks into one reconcile
    this._actionFlushTimer = null;        // shared debounce timer for the buffer above
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
      coupon_placeholder: 'Apply Coupon', total_label: 'Total', subtotal_label: 'Subtotal',
      savings_label: 'Congrats! You saved {amount} on this order.',
      offer_cards_heading: 'Pick your free gift',
      checkout_trust_message: 'Guaranteed safe & secure checkout',
      gift_add_button: 'Add', gift_remove_button: 'Remove', gift_adding: 'Adding...',
      gift_unavailable: 'Unavailable', gift_claimed: 'Claimed', gift_free_label: 'Free',
      claim_gift_button: 'Claim gift', claim_limit_reached: 'Limit reached',
      free_badge: 'FREE', line_remove: 'Remove', line_discount_format: '{pct}% off',
      coupon_view_all: 'View All', coupon_apply: 'Apply', coupon_remove: 'Remove',
      coupon_invalid: 'Invalid or inapplicable code',
      coupon_locked_message: 'Add {amount} more to apply this coupon',
      coupon_locked_qty_message: 'Add {count} more items to apply this coupon',
      coupon_saved_message: 'You saved {amount} with this coupon',
      coupons_panel_title: 'Offers & Coupons', coupons_panel_label: 'Available Coupons',
      coupons_panel_placeholder: 'Enter Coupon Code',
      upsells_empty_heading: '', upsell_sold_out: 'Sold out',
      price_breakup_link: 'VIEW PRICE BREAKUP', price_breakup_title: 'Price Break Up',
      pb_total_mrp: 'Total MRP', pb_discount_mrp: 'Discount on MRP', pb_coupon_discount: 'Coupon Discount',
      pb_shipping: 'Shipping Fee', pb_shipping_value: 'Calculated at checkout', pb_total: 'Total Amount',
      shipping_note: '',
    };
    this._layout = {
      drawer_position: 'right', image_style: 'rounded', qty_style: 'bordered', show_vendor: false, show_variant_switcher: true, show_remove_btn: true, show_payment_icons: true, show_compare_price: true,
      header_align: 'left', header_count_style: 'badge', remove_style: 'icon', qty_zero_pad: false,
      variant_position: 'actions', variant_style: 'switcher', line_discount_show_icon: true, gift_line_style: 'plain', gift_show_price: false,
      coupon_entry: 'input', coupon_cards_layout: 'scroll', savings_show_icon: true,
    };
    this._variantCache = {}; // product_id -> variants[]
    this._compareAtCache = {}; // variant_id (string) -> compare_at_price (cents, per unit)
    this._prefetchedHandles = {}; // product handle -> true, so compare-at is fetched once per session
    this._upsellAvail = {};          // product_id -> { available, variantId } live availability for upsell cards
    this._upsellAvailRequested = {}; // product_id -> true, fetched once per session
    this._recsPool = [];             // Shopify-recommended products topping up the candidates
    this._recsFetched = {};          // seed product + intent -> true, fetched once per session
    // Monotonic token for cart reads. A /cart.js read issued before a mutation
    // can resolve after it; we drop any read older than the latest authoritative
    // update so the count bubble never flickers back to a stale value.
    this._cartReadSeq = 0;
    // In-flight cart mutation promises (variant switch, etc.). Checkout awaits
    // these so it never navigates with a pre-mutation cart (old variant).
    this._activeOps = new Set();
    this._upsells = { card_layout: 'horizontal', card_size: 'medium', heading: '', btn_text: 'ADD TO CART', show_compare_price: true, show_discount: false, btn_position: 'below' };
    this._announcement = { text: '', type: 'static' };
    this._progressBar = { track_thickness: 'normal', milestone_icon_svg: '', completed_icon_svg: '', card_style: 'plain', badge_image_url: '', badge_corner: 'top-left' };
    this._typography = { heading_font: '', heading_case: 'normal', heading_letter_spacing: 0 };
    this._shape = { button_style: 'solid' };
    this._sections = { show_progress_bar: true, show_claim_gifts: true, show_offer_cards: true, show_coupons: true, show_upsells: true, show_ribbon: true, show_locked_coupons: false, coupon_panel_input: false, coupon_applied_style: 'chip', order: normalizeSectionOrder(null) };
    this._behavior = { auto_open_on_add: true, animation_style: 'slide', close_on_overlay_click: true, close_on_esc: true };
  }

  componentDidMount() {
    // GraphQL cart path (Phase D) — gated; default off. When on, reads/writes
    // for qty + remove route through the optimistic store instead of AJAX.
    this._graphqlCart = isGraphqlCartEnabled();
    // AJAX optimistic cart store — gated; default off. When on, ALL cart
    // reads/writes route through the store (the standard local-cart + resync
    // model, AJAX transport). Mutually exclusive with the GraphQL path.
    this._ajaxStore = !this._graphqlCart && isAjaxCartStoreEnabled();

    var rootEl = document.getElementById('cartmax-root');
    this._lastKnownItemCount = rootEl
      ? parseInt(rootEl.dataset.initialItemCount || '0', 10)
      : 0;

    // Hydrate from the server-rendered cart inlined by app-embed.liquid
    // (data-initial-cart). This lets the drawer paint its items instantly on
    // first open — no /cart.js round-trip on the critical path. The shape of
    // Liquid's `cart | json` matches /cart.js closely enough for first render;
    // loadCart() refreshes/reconciles in the background. Compare-at prefetch is
    // intentionally deferred (see _deferPrefetchCompareAt) to keep first paint cheap.
    if (rootEl && rootEl.dataset.initialCart) {
      try {
        var initialCart = JSON.parse(rootEl.dataset.initialCart);
        if (initialCart && typeof initialCart.item_count === 'number') {
          initialCart = this._stabiliseOrder(initialCart);
          this._currency = initialCart.currency || this._currency;
          this.state.cart = initialCart;   // pre-mount: avoid an extra render
          this.state.loading = false;
          this._lastKnownItemCount = initialCart.item_count;
          this._deferPrefetchCompareAt(initialCart.items || []);
        }
      } catch (_) { /* malformed JSON — fall back to loadCart() */ }
    }

    // ── Apply merchant styling as early as possible (avoid the flash) ──
    // Source 1 (best): config inlined server-side by app-embed.liquid
    // (data-drawer-config). When present this styles the element before first
    // paint — zero flash, no network.
    if (rootEl && rootEl.dataset.drawerConfig) {
      try {
        var inlineDrawer = JSON.parse(rootEl.dataset.drawerConfig);
        if (inlineDrawer && Object.keys(inlineDrawer).length) {
          this._maybeApplyDrawer(inlineDrawer);
        }
      } catch (_) { /* malformed/empty — fall through to cache / server */ }
    }
    // Source 2 (fallback): last-known config cached in localStorage. Styles the
    // element on mount for repeat visitors, so the drawer opens already-styled
    // even if the inlined config isn't available.
    this._applyCachedDrawerCfg();

    // If neither source styled us yet (true first visit), the `styled` gate
    // below keeps the drawer hidden until the server eval-result applies real
    // styling — so it never paints with default styling first. Long fallback is
    // a last-resort reveal in case styling never arrives (e.g. network failure).
    this._styleFallbackTimer = setTimeout(() => {
      if (!this.state.styled) this.setState({ styled: true });
    }, 5000);

    this._onCartChanged = (e) => {
      // GraphQL path owns cart state; ignore AJAX-pipeline cart updates so the
      // two don't fight over state.cart (the half-wired "item flashes" glitch).
      if (this._graphqlCart) return;
      // AJAX store path: an external cart change (theme ATC, other app) is the
      // authoritative server baseline — fold it into the store, which re-renders
      // via its subscription. Keep the auto-open + lastKnown bookkeeping here.
      if (this._ajaxStore) {
        if (e.detail && e.detail.cart) {
          ajaxReconcile(e.detail.cart);
          if (this._behavior.auto_open_on_add && e.detail.cart.item_count > this._lastKnownItemCount) {
            this.openDrawer();
          }
          this._lastKnownItemCount = e.detail.cart.item_count;
        } else if (this._behavior.auto_open_on_add) {
          this.openDrawer();
        }
        return;
      }
      if (e.detail && e.detail.cart) {
        // Merge in any optimistic gift the just-changed cart now qualifies for,
        // so an auto-add gift shows the instant the threshold is crossed (in
        // lockstep with the progress bar) rather than after the server add.
        var cart = applyOptimisticGifts(this._stabiliseOrder(e.detail.cart));
        this._currency = cart.currency || this._currency;
        this._cartReadSeq++;   // authoritative cart — supersede any in-flight loadCart
        this.setState({ cart: cart, loading: false });
        updateCartCount(cart.item_count);
        this._deferPrefetchCompareAt(cart.items || []);
        if (this._behavior.auto_open_on_add && cart.item_count > this._lastKnownItemCount) {
          this.openDrawer();
        }
        this._lastKnownItemCount = cart.item_count;
      } else {
        this.loadCart();
        if (this._behavior.auto_open_on_add) this.openDrawer();
      }
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
      if (this._graphqlCart) return;   // GraphQL store owns cart state
      if (this._ajaxStore) return;     // AJAX store owns cart state
      if (e.detail && e.detail.cart) {
        var newCart = this._stabiliseOrder(e.detail.cart);

        // Guard: never blank the drawer with a transient empty/partial cart
        // while another edit is still buffered — a corrective reconcile is
        // already on its way. Without this, an in-flight reconcile that lands
        // with 0 items flips `hasItems` false and the whole body flashes empty.
        if (this._isTransientEmpty(newCart)) return;

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
        this._cartReadSeq++;   // authoritative cart — supersede any in-flight loadCart
        updateCartCount(newCart.item_count);
        this.announce('Cart updated');
        this._clearProcessingTimeout();
      }
    };

    this._onOptimisticUpdate = (e) => {
      if (this._graphqlCart) return;   // GraphQL store owns cart state
      if (this._ajaxStore) return;     // AJAX store owns cart state
      if (e.detail && e.detail.cart) {
        var optimisticCart = applyOptimisticGifts(this._stabiliseOrder(e.detail.cart));
        if (this._isTransientEmpty(optimisticCart)) return;
        this._currency = optimisticCart.currency || this._currency;
        // Keep any qty still buffered (debounce not yet flushed) so a fast
        // follow-up click isn't reverted by this reconcile snapshot.
        var keepPending = {};
        Object.keys(this._actionBuffer).forEach((k) => {
          if (this.state.pendingQty.hasOwnProperty(k)) keepPending[k] = this.state.pendingQty[k];
        });
        this._cartReadSeq++;   // optimistic cart — supersede any in-flight loadCart
        this.setState({ cart: optimisticCart, pendingQty: keepPending });
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

    // GraphQL cart path (Phase D, gated): subscribe to the optimistic store so
    // the drawer renders the GraphQL cart, init it, then seed from the existing
    // AJAX cart so a returning shopper's items carry over. Writes (qty/remove)
    // route to the store in queueQuantityChange/handleRemove. The AJAX path
    // above stays wired but the store's reads win once it settles.
    if (this._graphqlCart) {
      this._unsubGql = gqlSubscribe(() => {
        var c = gqlGetCart();
        if (c) {
          this.setState({ cart: c, loading: false });
          updateCartCount(c.item_count);   // keep the theme bubble in sync with the GraphQL cart
          this._maybeRunGqlPromo(c);
        }
      });
      // Seed inside init so the GraphQL cart never renders empty before its
      // items land (the "item flashes away" glitch).
      gqlInitStore(this.state.cart).catch(() => {});
      // Phase E: take over the theme's add-to-cart so adds go to the GraphQL
      // cart (not the separate AJAX cart).
      this._installAtcTakeover();
    }

    // AJAX cart store: subscribe so the drawer renders the store's optimistic
    // cart, and seed it from the cart we already hydrated. External mutations
    // (theme ATC, other apps) fold in via _onCartChanged → ajaxReconcile.
    if (this._ajaxStore) {
      // Tell evaluate.js to stand down: the store drives eval + gift reconcile,
      // so evaluate.js must NOT also apply gifts via its own /cart/* calls.
      try { window.__cartxAjaxCartStoreActive = true; } catch (_) { /* noop */ }
      this._unsubAjax = ajaxSubscribe((state) => {
        var c = ajaxGetCart();
        if (c) {
          // cartSyncing dims the total while the single-flight sync settles, so
          // the money reads as "updating" rather than laggy (Option 1).
          this.setState({ cart: c, loading: false, cartSyncing: !!(state && state.loading) });
          updateCartCount(c.item_count);
          // Prefetch compare-at (strike-through) prices for the current lines —
          // /cart.js doesn't carry compare_at_price, so without this a
          // just-added product shows its plain price until the variant switcher
          // happens to fetch the product. Deferred + deduped per handle/session,
          // so it never blocks and fires at most one /products/{handle}.js per
          // product regardless of how often the store notifies.
          this._deferPrefetchCompareAt(c.items || []);
          this._maybeRunAjaxPromo(c);
        }
      });
      ajaxInit(this.state.cart);
      // The Liquid-embedded initial cart (data-initial-cart) lacks /cart.js-only
      // fields — notably discount_codes — so an ALREADY-applied discount code
      // wouldn't render as a chip until the first mutation forced a /cart.js.
      // Pull a fresh /cart.js once on mount and reconcile the store with it.
      fetchCart().then((c) => { if (c) ajaxReconcile(c); }).catch(function () { /* keep initial cart */ });
    }

    window.__cartmaxReady = true;

    // Flush cart changes the inline interceptor buffered before this bundle
    // mounted. We REPLAY the buffered event through the normal cart-changed
    // pipeline rather than handling it ad-hoc, so a pre-mount (cold-start) add is
    // processed IDENTICALLY to a post-mount one: _onCartChanged syncs state and
    // auto-opens, and evaluate.js re-runs the promo/progress-bar eval. (The old
    // path only called loadCart() + opened, which skipped the eval — so the first
    // add could leave the progress bar stale.) Each cart-changed carries the full
    // cart, so replaying the latest buffered one is sufficient.
    var queued = (window.__cartmaxQueue || []).slice();
    window.__cartmaxQueue = [];
    var lastWithCart = null;
    for (var qi = queued.length - 1; qi >= 0; qi--) {
      if (queued[qi] && queued[qi].detail && queued[qi].detail.cart) { lastWithCart = queued[qi]; break; }
    }
    if (lastWithCart) {
      window.dispatchEvent(new CustomEvent('cartmax:cart-changed', { detail: lastWithCart.detail }));
    } else if (queued.length > 0) {
      // Buffered change(s) without a cart payload — fall back to a reload.
      this.loadCart();
    } else if (window.__cartmaxOpenIntent) {
      // User clicked the cart icon before this bundle mounted. The inline
      // handler recorded the intent; honor it now. We already have cart state
      // (hydrated above) so this opens with items visible immediately.
      window.__cartmaxOpenIntent = false;
      if (window.__cartmaxTrigger) this._triggerElement = window.__cartmaxTrigger;
      this.loadCart();
      this.openDrawer();
    } else if (this.state.cart) {
      // Hydrated from inline cart but not opening — reconcile against the live
      // cart in the background so a stale server-rendered snapshot self-heals.
      this.loadCart();
    }

    // ── Analytics tracker ────────────────────────────────────
    var rootEl = document.getElementById('cartmax-root');
    if (rootEl) {
      var analyticsEnabled = rootEl.dataset.analyticsEnabled !== 'false';
      tracker.init({
        shopId: rootEl.dataset.shopId || '',
        customerId: rootEl.dataset.customerId || null,
        proxyBase: rootEl.dataset.proxyBase || '/apps/cartx',
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
    // Cooperative integration contract: partner apps call window.cartx.addItem()
    // (or dispatch a `cartx:add` CustomEvent) instead of POSTing /cart/add
    // themselves. We route the add into whichever cart is canonical (AJAX or the
    // GraphQL store), so the partner never needs to know our cart engine.
    // See docs/partner-cart-integration.md.
    var self = this;
    // Preserve any addItem/open calls the partner made before we mounted — the
    // early stub in app-embed.liquid buffers them on window.cartx._q.
    var pendingQueue = (window.cartx && window.cartx._q) || [];
    window.cartx = {
      open: function () {
        // Adopt the trigger captured by the inline click handler so focus
        // returns to the cart icon on close.
        if (window.__cartmaxTrigger) self._triggerElement = window.__cartmaxTrigger;
        self.loadCart();
        self.openDrawer();
      },
      close: function () { self.close(); },
      toggle: function () { self.state.open ? self.close() : (self.loadCart(), self.openDrawer()); },
      refresh: function () { self.loadCart(); window.dispatchEvent(new CustomEvent('cartmax:cart-changed', { detail: {} })); },
      isOpen: function () { return self.state.open; },
      addItem: function (payload) { return self.addItemPublic(payload); },
    };
    // Listen for the decoupled event contract too (no load-order dependency).
    this._onPublicAdd = function (e) { self.addItemPublic((e && e.detail) || {}); };
    window.addEventListener('cartx:add', this._onPublicAdd);
    // Flush anything buffered by the pre-mount stub.
    pendingQueue.forEach(function (entry) {
      var method = entry[0];
      var args = entry[1] || [];
      if (window.cartx && typeof window.cartx[method] === 'function') {
        try { window.cartx[method].apply(window.cartx, args); } catch (_) { /* ignore */ }
      }
    });

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

    // Cart icon click is intercepted by the inline capture-phase handler in
    // app-embed.liquid (runs before this bundle loads, so it beats the host
    // theme). That handler calls window.cartx.open() once we're mounted, or
    // sets window.__cartmaxOpenIntent for us to honor on mount (below). We
    // deliberately do NOT register a second document click listener here —
    // the inline one already stopImmediatePropagation()s, and a duplicate
    // would double-fire loadCart().

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
    if (this._unsubGql) this._unsubGql();
    if (this._unsubAjax) this._unsubAjax();
    if (this._onAtcSubmit) document.removeEventListener('submit', this._onAtcSubmit, true);
    if (this._onPublicAdd) window.removeEventListener('cartx:add', this._onPublicAdd);
    if (this._openRevealTimer) clearTimeout(this._openRevealTimer);
    if (this._gqlPromoTimer) clearTimeout(this._gqlPromoTimer);
    window.removeEventListener('cartmax:cart-changed', this._onCartChanged);
    window.removeEventListener('cartmax:eval-result', this._onEvalResult);
    window.removeEventListener('cartmax:internal-reload', this._onInternalReload);
    window.removeEventListener('cartmax:optimistic-update', this._onOptimisticUpdate);
    window.removeEventListener('cartmax:gift-unavailable', this._onGiftUnavailable);
    document.removeEventListener('mouseover', this._onDocMouseover);
    document.removeEventListener('keydown', this._onDocKeydown);
    if (this._horizonObserver) this._horizonObserver.disconnect();
    if (this._scrollLockObserver) this._scrollLockObserver.disconnect();
    if (this._promoObserver) this._promoObserver.disconnect();
    Object.values(this._debounceTimers).forEach(clearTimeout);
    if (this._actionFlushTimer) clearTimeout(this._actionFlushTimer);
    if (this._styleFallbackTimer) clearTimeout(this._styleFallbackTimer);
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
    this._cacheDrawerCfg(drawer);
    if (!this.state.styled) this.setState({ styled: true });
    var beh = drawer.behavior;
    if (beh && beh.confetti_lottie_url) setConfettiLottieUrl(beh.confetti_lottie_url);
  }

  // Cache the drawer config per shop so the next page load can style the drawer
  // on mount (before it opens), making repeat views flash-free without waiting
  // on the server round-trip.
  _drawerCfgKey() {
    var root = document.getElementById('cartmax-root');
    var shop = (root && root.dataset.shopId)
      || (window.Shopify && window.Shopify.shop)
      || 'default';
    return 'cartx:drawerCfg:' + shop;
  }

  _cacheDrawerCfg(drawer) {
    try { localStorage.setItem(this._drawerCfgKey(), JSON.stringify(drawer)); } catch (_) {}
  }

  _applyCachedDrawerCfg() {
    try {
      var raw = localStorage.getItem(this._drawerCfgKey());
      if (raw) this._maybeApplyDrawer(JSON.parse(raw));
    } catch (_) { /* no/!valid cache — server eval-result will style it */ }
  }

  // A label from the merchant's text settings. Empty falls back to the default,
  // so clearing a button label can never render an empty button.
  _t(key, fallback) {
    var v = this._text[key];
    return (v === undefined || v === null || v === '') ? fallback : v;
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
      show_compare_price: l.show_compare_price !== false,
      empty_icon_url: l.empty_icon_url || '',
      empty_icon_size: l.empty_icon_size || 'medium',
      empty_icon_color: l.empty_icon_color || '',
      show_payment_icons: l.show_payment_icons !== false,
      header_align: l.header_align === 'center' ? 'center' : 'left',
      header_count_style: l.header_count_style || 'badge',
      remove_style: l.remove_style === 'text' ? 'text' : 'icon',
      qty_zero_pad: l.qty_zero_pad === true,
      variant_position: l.variant_position === 'above_title' ? 'above_title' : 'actions',
      variant_style: l.variant_style === 'label' ? 'label' : 'switcher',
      line_discount_show_icon: l.line_discount_show_icon !== false,
      gift_line_style: l.gift_line_style === 'highlight' ? 'highlight' : 'plain',
      gift_show_price: l.gift_show_price === true,
      coupon_entry: l.coupon_entry === 'link' ? 'link' : 'input',
      coupon_cards_layout: l.coupon_cards_layout === 'list' ? 'list' : 'scroll',
      savings_show_icon: l.savings_show_icon !== false,
    };
    this._upsells = {
      card_layout: l.upsells_card_layout || 'horizontal',
      card_size: l.upsells_card_size || 'medium',
      heading: l.upsells_heading || '',
      heading_position: l.upsells_heading_position || 'left',
      show_on_empty: l.upsells_show_on_empty || 'filled',
      btn_text: l.upsells_btn_text || 'ADD TO CART',
      show_compare_price: l.upsells_show_compare_price !== false,
      show_discount: l.upsells_show_discount === true,
      btn_position: l.upsells_btn_position === 'over_image' ? 'over_image' : 'below',
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
      card_style: pb.card_style === 'card' ? 'card' : 'plain',
      badge_image_url: pb.badge_image_url || '',
      badge_corner: pb.badge_corner === 'top-right' ? 'top-right' : 'top-left',
      reached_color: !!pb.reached_dot_color,
    };
    this._addBtnColored = !!(drawer.colors && drawer.colors.add_button_bg);
    var ty = drawer.typography || {};
    this._typography = {
      heading_font: ty.heading_font || '',
      heading_case: ty.heading_case === 'uppercase' ? 'uppercase' : 'normal',
      heading_letter_spacing: Number(ty.heading_letter_spacing) || 0,
    };
    var sh = drawer.shape || {};
    this._shape = { button_style: sh.button_style || 'solid' };
    var sec = drawer.sections || {};
    this._sections = {
      show_progress_bar: sec.show_progress_bar !== false,
      show_claim_gifts: sec.show_claim_gifts !== false,
      show_offer_cards: sec.show_offer_cards !== false,
      show_coupons: sec.show_coupons !== false,
      allow_multiple_coupons: sec.allow_multiple_coupons === true,
      show_upsells: sec.show_upsells !== false,
      show_ribbon: sec.show_ribbon !== false,
      show_locked_coupons: sec.show_locked_coupons === true,
      coupon_panel_input: sec.coupon_panel_input === true,
      coupon_applied_style: sec.coupon_applied_style === 'card' ? 'card' : 'chip',
      order: normalizeSectionOrder(sec.order),
    };
    var beh = drawer.behavior || {};
    this._behavior = {
      auto_open_on_add: beh.auto_open_on_add !== false,
      animation_style: beh.animation_style || 'slide',
      close_on_overlay_click: beh.close_on_overlay_click !== false,
      close_on_esc: beh.close_on_esc !== false,
      checkout_js: beh.checkout_js || '',
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
    // GraphQL path owns the cart — never refetch /cart.js (the separate AJAX
    // cart), which would overwrite the store's cart with stale items and mix in
    // AJAX line keys. The store + its subscription are the source of truth.
    if (this._graphqlCart) return;
    // AJAX store owns the cart the same way — reconcile happens inside the store.
    if (this._ajaxStore) return;
    if (!this.state.cart) {
      this.setState({ loading: true });
    }
    // Claim the latest read token. If a newer cart update (an interceptor
    // cart-changed, a reconcile, or another loadCart) lands before this /cart.js
    // resolves, this read is stale and must NOT paint — otherwise the count
    // bubble flickers back to the pre-mutation value (0 → 1 → 0 → 1 on add).
    var seq = ++this._cartReadSeq;
    try {
      var cart = this._stabiliseOrder(await fetchCart());
      if (seq !== this._cartReadSeq) return;
      this._currency = cart.currency || this._currency;
      this.setState({ cart: cart, loading: false });
      updateCartCount(cart.item_count);
      this._deferPrefetchCompareAt(cart.items || []);
    } catch (err) {
      if (seq === this._cartReadSeq) this.setState({ loading: false });
    }
  }

  // ── Cart-mutation tracking ────────────────────────────────
  // Register an in-flight cart mutation (variant switch, etc.) so checkout can
  // wait for it to commit before navigating. Self-clears on settle.
  _trackOp(promise) {
    this._activeOps.add(promise);
    var clear = () => { this._activeOps.delete(promise); };
    promise.then(clear, clear);
    return promise;
  }

  // Resolves once no cart mutations are in flight (re-checks, since one op can
  // kick off another). Used by checkout so the server cart reflects the latest
  // edit — e.g. a just-selected variant — before we leave for /checkout.
  whenCartIdle() {
    if (this._activeOps.size === 0) return Promise.resolve();
    var self = this;
    return Promise.all(Array.from(this._activeOps).map((p) => p.catch(() => {})))
      .then(() => (self._activeOps.size === 0 ? undefined : self.whenCartIdle()));
  }

  // Run compare-at prefetch off the first-paint path. These /products/{handle}.js
  // requests only feed strike-through prices, which are not needed for the
  // initial render, so we wait for the browser to be idle (or a short timeout)
  // before firing them. Keeps the cart-open critical path free of extra fetches.
  _deferPrefetchCompareAt(items) {
    if (!items || !items.length) return;
    var run = () => this._prefetchCompareAtPrices(items);
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(run, { timeout: 2000 });
    } else {
      setTimeout(run, 300);
    }
  }

  _prefetchCompareAtPrices(items) {
    // Dedupe by handle; skip handles already cached via _variantCache
    var seen = {};
    items.forEach((item) => {
      if (!item.handle || seen[item.handle]) return;
      seen[item.handle] = true;
      // Already fetched this product this session — compare-at prices don't
      // change mid-session, so never re-fetch /products/{handle}.js on every
      // cart change (that was firing a request per line after each add/qty tick).
      if (this._prefetchedHandles[item.handle]) return;
      var cached = this._variantCache[String(item.product_id)];
      if (cached && cached.length) {
        this._prefetchedHandles[item.handle] = true;
        cached.forEach((v) => {
          if (v.compare_at_price) this._compareAtCache[String(v.id)] = v.compare_at_price;
        });
        return;
      }
      this._prefetchedHandles[item.handle] = true;
      fetch('/products/' + item.handle + '.js')
        .then((r) => r.json())
        .then((p) => {
          if (!p.variants) return;
          p.variants.forEach((v) => {
            if (v.compare_at_price) this._compareAtCache[String(v.id)] = v.compare_at_price;
          });
          this.setState({});
        })
        .catch(() => {});
    });
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
    // If the host theme's cart handler ran too (our capture-phase interception
    // was bypassed), it may have left a scroll-lock class on body/html. cartx is
    // taking over the drawer, so clear it — otherwise the page stays unscrollable.
    this._clearThemeScrollLock();
    // Fail-safe: never leave the drawer open-but-invisible if the `styled` gate
    // hasn't resolved yet (slow/empty styling source). Reveal shortly after open.
    if (!this.state.styled) {
      if (this._openRevealTimer) clearTimeout(this._openRevealTimer);
      this._openRevealTimer = setTimeout(() => {
        if (!this.state.styled) this.setState({ styled: true });
      }, 350);
    }
    this.announce('Cart opened');
    window.dispatchEvent(new CustomEvent('cartmax:drawer-opened'));

    this._openedAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    var cart = this.state.cart;
    tracker.track(ANALYTICS_EVENTS.DRAWER_OPENED, {
      cart_total: cart ? cart.total_price : null,
      item_count: cart ? cart.item_count : null,
    });
  }

  // Strip common theme scroll-lock classes the host theme may have added to
  // body/html when its (now-suppressed) cart drawer "opened". cartx owns the
  // cart, so when our drawer opens or closes the page must scroll normally.
  _clearThemeScrollLock() {
    var CLASSES = ['overflow-hidden', 'no-scroll', 'scroll-lock', 'cart-drawer-open'];
    [document.body, document.documentElement].forEach(function (el) {
      if (!el) return;
      for (var i = 0; i < CLASSES.length; i++) el.classList.remove(CLASSES[i]);
    });
  }

  // ── Phase E: theme add-to-cart takeover ──────────────────
  // Capture-phase submit listener on the theme's ATC forms. The native
  // /cart/add targets the SEPARATE AJAX cart, so we preventDefault it and route
  // the add into the GraphQL cart (store.addLine) instead, then open the drawer.
  // Reads variant id, quantity and line-item properties straight from the form,
  // so it works without per-theme markup knowledge for standard ATC forms.
  // (Themes whose ATC is a pure JS button with no form submit need a per-theme
  // click adapter — a follow-up.)
  _installAtcTakeover() {
    this._onAtcSubmit = (e) => {
      var form = e.target;
      if (!form || form.nodeName !== 'FORM') return;
      if ((form.getAttribute('action') || '').indexOf('/cart/add') === -1) return;
      var fd;
      try { fd = new FormData(form); } catch (_) { return; }
      var variantId = fd.get('id');
      if (!variantId) return;   // not a standard single-variant ATC form — let it through
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      var qty = parseInt(fd.get('quantity') || '1', 10) || 1;
      var props = {};
      fd.forEach(function (val, key) {
        if (key.indexOf('properties[') === 0 && key.charAt(key.length - 1) === ']') {
          var pk = key.slice(11, -1);
          if (pk) props[pk] = val;
        }
      });
      gqlAddLine(variantId, qty, props, {});
      this.openDrawer();
    };
    document.addEventListener('submit', this._onAtcSubmit, true);   // capture, before theme handlers
  }

  // Public add entry point — used by window.cartx.addItem() and the `cartx:add`
  // event. Partner apps call this so their add lands in cartx's cart regardless
  // of which engine (AJAX or GraphQL store) is canonical. Returns a Promise.
  // payload: { id|variant_id, quantity, properties, source?, open? }
  addItemPublic(payload) {
    payload = payload || {};
    var id = payload.id || payload.variant_id || payload.variantId;
    if (!id) {
      console.warn('[cartx] addItem: missing variant id', payload);
      return Promise.reject(new Error('cartx.addItem: missing variant id'));
    }
    id = String(normalizeVariantId(id));
    var qty = parseInt(payload.quantity != null ? payload.quantity : payload.qty, 10) || 1;
    var props = payload.properties || {};
    if (payload.source) {
      props = Object.assign({}, props);
      props._cartx_source = String(payload.source);   // optional attribution
    }
    var self = this;
    var shouldOpen = payload.open != null
      ? !!payload.open
      : (this._behavior && this._behavior.auto_open_on_add !== false);

    if (this._graphqlCart) {
      gqlAddLine(id, qty, props, {});
      if (shouldOpen) this.openDrawer();
      return gqlWhenSettled ? gqlWhenSettled() : Promise.resolve();
    }
    if (this._ajaxStore) {
      ajaxAddLine(id, qty, props, {});
      if (shouldOpen) this.openDrawer();
      return ajaxWhenSettled ? ajaxWhenSettled() : Promise.resolve();
    }
    return internalFetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id, quantity: qty, properties: props }),
    }).then(function (r) { return r.json(); }).then(function (line) {
      self.loadCart();
      if (shouldOpen) self.openDrawer();
      window.dispatchEvent(new CustomEvent('cartmax:cart-changed', { detail: { source: 'api' } }));
      return line;
    });
  }

  // ── GraphQL promo pipeline (Phase D: bar + gift auto-add) ──
  // The evaluate-cart proxy computes the bar/ribbon/coupons/gifts from whatever
  // cart we POST it. For the GraphQL path we feed it the mapped GraphQL cart,
  // render the bar via the existing `eval-result` event, and route its gift
  // to_add/to_remove through the STORE (not AJAX). Triggered only when the cart
  // item signature changes (so gift reconciliation converges, no eval loop) and
  // debounced so rapid edits collapse into one proxy call.
  _cartSignature(cart) {
    var items = (cart && cart.items) || [];
    var lines = items.map(function (it) {
      // The ':u' marker is what makes a placeholder line and its reconciled,
      // priced self produce DIFFERENT signatures. Without it both hash the same
      // (variant + qty + offer are unchanged by reconcile), so the sig guard in
      // _maybeRunAjaxPromo swallowed the corrected evaluation and the cart was
      // left evaluated as if it were empty.
      return it.variant_id + ':' + (it.quantity || 0) + ':'
        + (it.properties ? (it.properties._offer_id || '') : '')
        + (it._cartx_unpriced ? ':u' : '');
    }).sort().join('|');
    // Include the applied discount codes: a coupon apply/remove leaves items and
    // quantities untouched, so without this the signature is identical and the
    // promo eval (which recomputes total_savings + coupon availability) is
    // skipped — leaving the footer "you saved {amount}" stale until a qty change.
    var codes = ((cart && cart.discount_codes) || [])
      .filter(function (d) { return d.applicable; })
      .map(function (d) { return d.code; })
      .sort()
      .join(',');
    return lines + '#' + codes;
  }

  _maybeRunGqlPromo(cart) {
    var sig = this._cartSignature(cart);
    if (sig === this._lastPromoSig) return;   // no item change → no re-eval
    this._lastPromoSig = sig;
    if (this._gqlPromoTimer) clearTimeout(this._gqlPromoTimer);
    this._gqlPromoTimer = setTimeout(() => this._runGqlPromo(), 250);
  }

  async _runGqlPromo() {
    var cart = gqlGetCart();
    if (!cart) return;
    try {
      var result = await callEvaluate(cart);
      if (!result) return;
      // Bar / ribbon / coupons / savings (reuses the existing handler).
      window.dispatchEvent(new CustomEvent('cartmax:eval-result', {
        detail: Object.assign({}, result, { _server: true }),
      }));
      this._reconcileGqlGifts(result, cart);
    } catch (err) {
      console.error('[cartx] gql promo eval failed:', err);
    }
  }

  // Hard idempotency guard: force each cartx gift (variant + _offer_id) to its
  // configured quantity. Keeps the first line (reduced to giftIntendedQuantity if
  // inflated) and removes any EXTRA lines of the same gift. Guarantees "one gift,
  // correct amount" however duplicates/over-quantities arise — races, a sold-out
  // retry, or a manual/hacked add. Only touches cartx gift lines (_freebie +
  // _offer_id) and only collapses the SAME variant+offer, so distinct gifts of a
  // "pick N" claim offer are untouched. removeFn/changeQtyFn are the active cart
  // store's mutators (ajax or gql). Runs every reconcile → self-heals + converges.
  _normalizeGiftQuantities(cart, removeFn, changeQtyFn) {
    var items = (cart && cart.items) || [];
    var seen = {};
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var p = it.properties;
      if (!p || p['_freebie'] !== 'true' || !p['_offer_id']) continue;
      var key = String(normalizeVariantId(it.variant_id)) + '|' + p['_offer_id'];
      if (seen[key]) {
        removeFn(it.key);                                   // extra line — drop it
      } else {
        seen[key] = true;
        var intended = giftIntendedQuantity(p['_offer_id']);
        if ((it.quantity || 0) > intended) changeQtyFn(it.key, intended); // cap inflated line
      }
    }
  }

  // Add/remove automatic gift lines on the GraphQL cart to match the eval result.
  // Idempotent: only adds a gift not already present, only removes listed lines.
  // Each store mutation re-triggers eval; it converges once gifts are settled.
  _reconcileGqlGifts(result, cart) {
    this._normalizeGiftQuantities(cart, gqlRemoveLine, gqlChangeQuantity);
    (result.to_remove || []).forEach(function (key) { gqlRemoveLine(key); });
    var items = (cart && cart.items) || [];
    (result.to_add || []).forEach(function (item) {
      var vid = String(normalizeVariantId(item.variant_id));
      var offerId = item.properties && item.properties._offer_id;
      var present = items.some(function (it) {
        return String(it.variant_id) === vid && it.properties && it.properties._offer_id === offerId;
      });
      if (!present) gqlAddLine(vid, item.quantity || 1, item.properties || {}, {});
    });
  }

  // On each store cart change: (1) reconcile auto-gift lines INSTANTLY from
  // local eval (add newly-triggered gifts with their real title/image, pull
  // gifts whose threshold is no longer met), then (2) run the server eval,
  // debounced, purely for the bar/ribbon/coupons + the cartx marker. The gift
  // add/remove no longer waits on the server round-trip (fixes the "gift not
  // removed below threshold" bug + the "Free gift" skeleton).
  _maybeRunAjaxPromo(cart) {
    this._reconcileLocalGifts(cart);
    var sig = this._cartSignature(cart);
    if (sig === this._lastPromoSig) return;
    this._lastPromoSig = sig;

    // Paint the bar NOW from cached config, then let the debounced server call
    // below confirm it. Measured: the evaluate-cart round-trip is ~1.6s from
    // India of which our server is ~6ms, so waiting on it was the entire
    // perceived cost of a cart change.
    //
    // Three guards, each protecting a case where a client-side estimate would
    // be worse than waiting:
    //   1. kill switch — turn the whole thing off at runtime, no redeploy.
    //   2. unpriced lines — the cart contains a placeholder we can't price;
    //      the skeleton is showing and any local number would be fiction.
    //   3. cartHasDiscounts — coupons, automatic and volume discounts are
    //      computed server-side and a client `price × qty` estimate is known to
    //      be wrong for them (see the note on cartHasDiscounts). These carts
    //      keep the old behaviour: one correct state, slightly later.
    if (!window.__cartxDisableLocalBar
      && !this._hasUnpricedLines(cart)
      && !cartHasDiscounts(cart)) {
      try { dispatchLocalBar(cart); } catch (_) { /* never block the server path */ }
    }
    if (this._ajaxPromoTimer) clearTimeout(this._ajaxPromoTimer);
    this._ajaxPromoTimer = setTimeout(() => this._runAjaxPromo(), 250);
  }

  // Instant, local auto-gift reconcile through the store. Idempotent: only adds
  // a gift not already present, only removes lines local eval flagged — so the
  // subsequent store notify converges (no loop).
  _reconcileLocalGifts(cart) {
    // Re-entrancy guard: ajaxRemoveLine/ajaxAddLine notify subscribers
    // SYNCHRONOUSLY, which re-enters this method mid-loop — causing duplicate
    // removeLine calls and racing /cart/update.js syncs (the 422s). Apply the
    // whole plan in one pass; the next (post-notify) reconcile converges.
    if (this._reconcilingGifts) return;
    var plan = localGiftDelta(cart);
    if (!plan) return;
    var self = this;
    var items = (cart && cart.items) || [];
    this._reconcilingGifts = true;
    try {
      // Force every cartx gift to its configured quantity (removes duplicate lines
      // and caps inflated ones) before applying the add/remove plan.
      this._normalizeGiftQuantities(cart, ajaxRemoveLine, ajaxChangeQty);

      // Clear the optimistic "claimed" flag for any gift we auto-remove, so its
      // claim card reverts to "Claim gift" instead of a stuck, disabled
      // "Claimed" button once the shopper drops below (and later crosses back
      // above) the threshold. Mirrors handleClaimRemove's cleanup for the auto
      // removal path.
      if (plan.to_remove && plan.to_remove.length) {
        var nextClaimed = null;
        plan.to_remove.forEach(function (key) {
          var line = items.find(function (it) { return it.key === key; });
          if (!line) return;
          var vid = String(normalizeVariantId(line.variant_id));
          var ck = 'claim_' + vid, ok = 'offer_' + vid;
          if (self.state.claimed[ck] || self.state.claimed[ok]) {
            if (!nextClaimed) nextClaimed = Object.assign({}, self.state.claimed);
            delete nextClaimed[ck];
            delete nextClaimed[ok];
          }
        });
        if (nextClaimed) self.setState({ claimed: nextClaimed });
      }
      (plan.to_remove || []).forEach(function (key) { ajaxRemoveLine(key); });
      (plan.to_add || []).forEach(function (g) {
        var vid = String(normalizeVariantId(g.variant_id));
        var offerId = g.properties && g.properties._offer_id;
        var present = items.some(function (it) {
          return String(normalizeVariantId(it.variant_id)) === vid && it.properties && it.properties._offer_id === offerId;
        });
        if (!present) ajaxAddLine(vid, g.quantity || 1, g.properties || {}, { price: 0, title: g.title, product_title: g.title, image: g.image });
      });
    } finally {
      this._reconcilingGifts = false;
    }
  }

  // True while the cart holds a placeholder line whose price we don't know yet
  // (window.cartx.addItem gives us only a variant id). Gate on THIS, never on
  // price === 0 — free gifts are legitimately zero and must keep evaluating.
  _hasUnpricedLines(cart) {
    var items = (cart && cart.items) || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i]._cartx_unpriced) return true;
    }
    return false;
  }

  async _runAjaxPromo() {
    var cart = ajaxGetCart();
    if (!cart) return;
    // Never evaluate a cart we can't price: the server would correctly compute
    // thresholds against a phantom 0 total and report every reward locked.
    // The sync reconciles within one /cart/add.js round-trip and the signature
    // change (':u' above) re-triggers this with real money.
    if (this._hasUnpricedLines(cart)) return;
    try {
      var result = await callEvaluate(cart);
      if (!result) return;
      // Server drives the bar/ribbon/coupons only — gifts are reconciled locally
      // in _reconcileLocalGifts, so we don't apply to_add/to_remove here.
      window.dispatchEvent(new CustomEvent('cartmax:eval-result', {
        detail: Object.assign({}, result, { _server: true }),
      }));
      // Mark the cart cartx-active so the volume-discount Function can apply.
      // (Idempotent; only fires when the config actually has a volume offer.)
      ensureCartxAttribute(cart);
      // Mark the cart as checked-out-via-the-cartx-drawer (once, when it has
      // items) so the resulting order is attributable to cartx in the A/B split.
      if (cart.item_count > 0) ensureDrawerAttribute(cart);
    } catch (err) {
      console.error('[cartx] ajax promo eval failed:', err);
    }
  }

  close() {
    if (this._focusCleanup) {
      this._focusCleanup();
      this._focusCleanup = null;
    }
    this.setState({ open: false });
    document.body.style.overflow = '';
    this._clearThemeScrollLock();
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

  // ── Quantity + remove mutations (debounced & coalesced) ───
  // Every line mutation (qty change or remove) funnels through one short
  // debounce buffer. A burst of clicks — several +'s, or deleting multiple
  // lines in a row — collapses into a SINGLE server reconcile / re-render
  // instead of one heavyweight round-trip per click (the cause of the qty
  // "freeze" and the delete "blink"). The UI reflects each click instantly
  // (pendingQty / tombstone fade), so the buffering is invisible to the
  // shopper; it only coalesces the expensive part.

  queueQuantityChange(key, qty) {
    // GraphQL cart path: route to the optimistic store (instant local update +
    // single-flight server sync). The store's subscription re-renders the cart.
    if (this._graphqlCart) {
      if (qty <= 0) gqlRemoveLine(key); else gqlChangeQuantity(key, qty);
      return;
    }
    if (this._ajaxStore) {
      if (qty <= 0) ajaxRemoveLine(key); else ajaxChangeQty(key, qty);
      return;
    }
    var pendingQty = Object.assign({}, this.state.pendingQty);
    pendingQty[key] = qty;
    this.setState({ pendingQty: pendingQty });
    this._bufferAction(key, qty);
  }

  // Stage one line mutation and (re)arm the shared flush timer. Last write
  // per key wins (e.g. +,+,+ → final qty; a later remove → qty 0).
  _bufferAction(key, qty) {
    this._actionBuffer[key] = qty;
    if (this._actionFlushTimer) clearTimeout(this._actionFlushTimer);
    this._actionFlushTimer = setTimeout(() => this._flushActions(), DEBOUNCE_DELAY);
  }

  // Dispatch all buffered mutations as ONE cart-action → one server reconcile.
  _flushActions() {
    this._actionFlushTimer = null;
    var buffer = this._actionBuffer;
    this._actionBuffer = {};
    var keys = Object.keys(buffer);
    if (!keys.length) return;
    var actions = keys.map(function (k) { return { key: k, qty: buffer[k] }; });
    var updating = Object.assign({}, this.state.updating);
    keys.forEach(function (k) { updating[k] = true; });
    this.setState({ updating: updating });
    this._startProcessingTimeout();
    window.dispatchEvent(new CustomEvent('cartmax:cart-action', {
      detail: { cart: this.state.cart, actions: actions },
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
    var cart = this.state.cart;
    if (!cart || !cart.items) return;

    // GraphQL cart path: optimistic remove via the store (re-renders on sync).
    if (this._graphqlCart) { gqlRemoveLine(key); return; }
    if (this._ajaxStore) { ajaxRemoveLine(key); return; }

    var line = cart.items.find(function (i) { return i.key === key; });

    // Defer GIFT_REMOVED analytics until reconcile confirms (see _onInternalReload).
    if (line && line.properties && line.properties._freebie === 'true') {
      this._pendingGiftRemovals[key] = {
        promotion_id: line.properties._offer_id || null,
        promotion_type: line.properties._cartmax_claim === 'true' ? 'claim-gift' : 'offer',
        variant_id: String(line.variant_id),
      };
    }

    // Snapshot the line as a tombstone so it stays mounted (and visible) while
    // its collapse animation plays, then strip it from the cart IMMEDIATELY so
    // the rest of the list stays put. The server removal is coalesced through
    // the shared buffer, but the visual is instant and per-line, so deleting
    // several items in a row collapses each row smoothly instead of blanking
    // the whole cart while a batched reconcile is in flight.
    if (line) this._removingTombstones[key] = line;

    var removing = Object.assign({}, this.state.removing);
    removing[key] = true;
    var stripped = this._stripLine(cart, key);
    this.setState({ removing: removing, cart: stripped });
    updateCartCount(stripped.item_count);

    this._scheduleTombstoneDrop(key);
    this._bufferAction(key, 0);
    this.announce('Removing item...');
  }

  // Optimistic local removal: drop one line and recompute cart totals so the
  // footer stays right until the server reconcile lands. Mirrors the totals
  // math in evaluate.js simulateCart().
  _stripLine(cart, key) {
    var items = [];
    var total = 0, orig = 0, count = 0;
    for (var i = 0; i < cart.items.length; i++) {
      var it = cart.items[i];
      if (it.key === key) continue;
      items.push(it);
      total += (it.final_line_price || 0);
      orig += (it.original_line_price || it.line_price || 0);
      count += (it.quantity || 0);
    }
    return Object.assign({}, cart, {
      items: items,
      total_price: total,
      original_total_price: orig,
      total_discount: Math.max(0, orig - total),
      item_count: count,
      items_subtotal_price: total,
    });
  }

  // True while the shopper has edits that haven't reconciled yet: a debounce
  // window armed, actions buffered, or optimistic quantities on screen. Used to
  // suppress the empty-state and transient-empty carts mid-edit.
  _hasPendingEdits() {
    return this._actionFlushTimer != null
      || Object.keys(this._actionBuffer).length > 0
      || Object.keys(this.state.pendingQty).length > 0;
  }

  // An incoming reconcile/optimistic cart that has 0 items while we still hold
  // a non-empty cart AND more edits are queued is a mid-flight artifact, not a
  // real emptying — applying it would flash the whole body blank.
  _isTransientEmpty(incoming) {
    var incomingEmpty = !incoming || !incoming.items || incoming.items.length === 0;
    if (!incomingEmpty) return false;
    var cur = this.state.cart;
    var haveItems = cur && cur.items && cur.items.length > 0;
    var moreComing = this._actionFlushTimer != null || Object.keys(this._actionBuffer).length > 0;
    return haveItems && moreComing;
  }

  // Hold a tombstoned line in the DOM for its collapse animation, then drop it.
  _scheduleTombstoneDrop(key) {
    if (this._tombstoneTimers[key]) return;   // already scheduled
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
    // While any line is unpriced the last eval describes a cart that no longer
    // exists, and showing its tiers would tell the shopper their rewards are
    // locked when they may well have just unlocked them.
    if (this._hasUnpricedLines(this.state.cart)) {
      return (
        <div id="cartmax-progress" class="cartmax-progress cartmax-progress-skeleton" aria-busy="true">
          <div class="cartmax-skel cartmax-skel-line cartmax-skel-msg" />
          <div class="cartmax-skel cartmax-skel-track" />
          <span class="visually-hidden">Updating rewards…</span>
        </div>
      );
    }
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
    var progressCls = 'cartmax-progress'
      + (pb.card_style === 'card' ? ' cartmax-progress--card' : '')
      + (pb.reached_color ? ' cartmax-progress--reached-color' : '');

    return (
      <div id="cartmax-progress" className={progressCls}>
        {pb.badge_image_url ? (
          <img
            class={'cartmax-progress-badge cartmax-progress-badge--' + pb.badge_corner}
            src={pb.badge_image_url}
            alt=""
            aria-hidden="true"
          />
        ) : null}
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
        return { id: v.id, title: v.title, available: v.available, price: v.price || 0, compare_at_price: v.compare_at_price || 0, featured_image: v.featured_image || null };
      });
      this._variantCache[productId] = variants;
      variants.forEach((v) => {
        if (v.compare_at_price) this._compareAtCache[String(v.id)] = v.compare_at_price;
      });
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

    // Store paths: a variant switch is remove-old + add-new. The store applies
    // both optimistically and reconciles in one single-flight sync.
    if (this._graphqlCart || this._ajaxStore) {
      var cached = this._variantCache[String(item.product_id)] || [];
      var nv = cached.find((v) => String(v.id) === String(newVariantId)) || {};
      var meta = { price: nv.price || 0, title: item.product_title, product_title: item.product_title, variant_title: nv.title || null, image: (nv.featured_image && nv.featured_image.src) || item.image, handle: item.handle, product_id: item.product_id };
      if (this._graphqlCart) { gqlRemoveLine(key); gqlAddLine(newVariantId, qty, item.properties || {}, meta); }
      else { ajaxRemoveLine(key); ajaxAddLine(newVariantId, qty, item.properties || {}, meta); }
      this.setState({ variantOpen: nextOpen });
      return;
    }

    var snapshot = this.state.cart;
    var cachedVariants = this._variantCache[String(item.product_id)] || [];
    var newVariant = cachedVariants.find((v) => String(v.id) === String(newVariantId));
    // pending_ prefix lets _stabiliseOrder alias this to the real server key on reconcile
    var pendingKey = 'pending_varswitch_' + key + '_' + newVariantId;

    if (newVariant && snapshot) {
      var unitPrice = newVariant.price || 0;
      var optimisticItem = Object.assign({}, item, {
        key: pendingKey,
        variant_id: Number(newVariantId),
        variant_title: newVariant.title || item.variant_title,
        price: unitPrice,
        original_price: unitPrice,
        final_price: unitPrice,
        line_price: unitPrice * qty,
        final_line_price: unitPrice * qty,
        original_line_price: unitPrice * qty,
        image: (newVariant.featured_image && newVariant.featured_image.src) || item.image,
        line_level_discount_allocations: [],
      });
      var optimisticItems = (snapshot.items || []).map((it) =>
        it.key === key ? optimisticItem : it
      );
      var totalPrice = 0;
      var itemCount = 0;
      optimisticItems.forEach(function(it) {
        totalPrice += (it.final_line_price || 0);
        itemCount += (it.quantity || 0);
      });
      var optimisticCart = Object.assign({}, snapshot, {
        items: optimisticItems,
        total_price: totalPrice,
        item_count: itemCount,
        items_subtotal_price: totalPrice,
      });
      if (newVariant.compare_at_price) {
        this._compareAtCache[String(newVariantId)] = newVariant.compare_at_price;
      }
      this.setState({
        variantOpen: nextOpen,
        updating: Object.assign({}, this.state.updating, { [pendingKey]: true }),
        cart: optimisticCart,
        pendingQty: {},
      });
      updateCartCount(optimisticCart.item_count);
    } else {
      this.setState({
        variantOpen: nextOpen,
        updating: Object.assign({}, this.state.updating, { [key]: true }),
      });
    }

    this._startProcessingTimeout();

    // Track the change→add→reconcile sequence so an instant checkout click
    // waits for the new variant to actually land in the server cart instead of
    // navigating with the old variant still in it.
    var op = (async () => {
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
        if (snapshot) {
          this.setState({ cart: snapshot, pendingQty: {} });
          updateCartCount(snapshot.item_count);
        }
        var usedKey = newVariant ? pendingKey : key;
        var newUpdating = Object.assign({}, this.state.updating);
        delete newUpdating[usedKey];
        this.setState({ updating: newUpdating });
        this.loadCart();
      }
    })();
    this._trackOp(op);
    await op;
  }

  // ── Render: Line Item ─────────────────────────────────────

  renderLineItem(item) {
    // Placeholder line: we know a product is being added but not what it costs
    // or what it's called. Render its shape rather than an empty title and a
    // confident-looking 0 — the real data lands one round-trip later.
    if (item._cartx_unpriced) {
      return (
        <div class="cartmax-line-item cartmax-line-skeleton" key={item.key} aria-busy="true">
          <div class="cartmax-line-image">
            <div class="cartmax-skel cartmax-skel-img" />
          </div>
          <div class="cartmax-line-details">
            <div class="cartmax-skel cartmax-skel-line cartmax-skel-title" />
            <div class="cartmax-skel cartmax-skel-line cartmax-skel-price" />
          </div>
          <span class="visually-hidden">Adding item…</span>
        </div>
      );
    }
    var isUpdating = this.state.updating[item.key];
    var isRemoving = this.state.removing[item.key];
    var displayQty = this.getDisplayQty(item);
    var isPending = this.state.pendingQty.hasOwnProperty(item.key);
    var curr = this._currency;
    // Any freebie marker (cartx `_freebie` or a partner's `*_freebie*`, e.g.
    // GoKwik's `_gokwik_freebie`) makes it a gift line — no qty selector.
    var isFreebie = hasFreebieMarker(item.properties) && item.properties['_claimed'] !== 'true';
    var isClaimed = item.properties && (item.properties['_claimed'] === 'true' || item.properties['_cartmax_claim'] === 'true');
    var isVariantOpen = this.state.variantOpen[item.key];
    var isVariantLoading = this.state.variantLoading[item.key];
    var cachedVariants = this._variantCache[String(item.product_id)] || [];

    var layout = this._layout;
    var showVariantSwitcher = layout.show_variant_switcher && item.variant_title && !isFreebie && !isClaimed;
    // Text remove ("REMOVE" link on every line) replaces the bin entirely, so it
    // needs the remove button on — otherwise the bin in the qty row stays.
    var textRemove = layout.remove_style === 'text' && layout.show_remove_btn && !isFreebie && !isClaimed;
    // Separate remove button: only when qty > 1 (at qty=1 trash is in the qty row)
    var showRemoveBtn = !textRemove && layout.show_remove_btn && displayQty > 1 && !isFreebie && !isClaimed;
    var variantOnTop = layout.variant_position === 'above_title';

    // Freebie lines have no variant switcher, so the variant only shows if it's
    // part of the title. The optimistic gift line's enriched title already bakes
    // it in ("Product - Variant", variant_title null), while the reconciled
    // Shopify line splits product_title + variant_title — which dropped the
    // "- 100 ml" on reconcile. Fold it back in so the name is stable across the
    // reconcile. Guarded by indexOf so we never double-append the optimistic case.
    var lineTitle = item.product_title;
    if (isFreebie && item.variant_title && item.variant_title !== 'Default Title'
        && String(item.product_title || '').indexOf(item.variant_title) === -1) {
      lineTitle = item.product_title + ' - ' + item.variant_title;
    }

    // A claim gift can be configured at a price ("Customer pays"); it's stamped
    // on the line as `_claim_price` (per-unit, minor units). Show that price
    // rather than "FREE" when it's > 0.
    var claimPriceUnit = (isClaimed && item.properties && item.properties._claim_price)
      ? Number(item.properties._claim_price) : 0;
    var claimPriceLine = claimPriceUnit * (item.quantity || 1);

    // What Shopify is ACTUALLY charging for this line. A gift line is only
    // "FREE" when the discount really landed. If a merchant discount code has
    // "combines with product discounts" off, Shopify drops our automatic gift
    // discount and the shopper IS charged for the gift — printing FREE there
    // hides a real charge and makes the cart total look wrong. Missing price
    // fields fall through to 0, so optimistic gift lines still render FREE.
    var giftChargedLine = giftChargedAmount(item);

    var cls = 'cartmax-line-item'
      + (isRemoving ? ' cartmax-line-removing' : '')
      + (isFreebie ? ' cartmax-line-freebie' : '')
      + ((isFreebie || isClaimed) && layout.gift_line_style === 'highlight' ? ' cartmax-line-gift--highlight' : '');

    var removeText = textRemove
      ? <button
          class="cartmax-line-remove-text"
          onClick={() => this.handleRemove(item.key)}
          disabled={isRemoving}
          aria-label={'Remove ' + item.product_title}
        >{this._t('line_remove', 'Remove')}</button>
      : null;

    var variantNode = null;
    if (showVariantSwitcher && layout.variant_style === 'label') {
      variantNode = <span class="cartmax-variant-pill cartmax-variant-pill--label">{item.variant_title}</span>;
    } else if (showVariantSwitcher) {
      variantNode = (
        <div class="cartmax-variant-wrap">
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
      );
    }

    return (
      <div class={cls} key={item.key}>
        <div class="cartmax-line-image">
          {item.image
            ? <img src={resizeImage(item.image, 96)} alt={item.title} width="64" height="64" loading="lazy" />
            : <div class="cartmax-line-image-placeholder"><span class="visually-hidden">No image</span></div>
          }
        </div>
        <div class="cartmax-line-details">
          {variantOnTop && (variantNode || removeText)
            ? <div class="cartmax-line-top-row">
                {variantNode || <span />}
                {removeText}
              </div>
            : null
          }
          {this._layout.show_vendor && item.vendor ? <div class="cartmax-line-vendor">{item.vendor}</div> : null}
          <div class="cartmax-line-title-row">
            <div class="cartmax-line-title">{lineTitle}</div>
            {!variantOnTop ? removeText : null}
            {showRemoveBtn
              ? <button
                  class="cartmax-line-remove"
                  onClick={() => this.handleRemove(item.key)}
                  disabled={isRemoving}
                  aria-label={'Remove ' + item.product_title}
                ><IconTrash /></button>
              : null
            }
          </div>
          <div class="cartmax-line-price">
            {(isFreebie || isClaimed)
              ? (claimPriceLine > 0
                  ? [
                      <span key="cp">{formatMoney(claimPriceLine, curr)}</span>,
                      (item.original_line_price > claimPriceLine)
                        ? <span key="orig" class="cartmax-line-price-original">{formatMoney(item.original_line_price, curr)}</span>
                        : null,
                      // Keep the freebie identity even at a nominal price.
                      <span key="giftbadge" class="cartmax-gift-badge">GIFT</span>,
                    ]
                  : (giftChargedLine > 0
                      ? [
                          <span key="gp">{formatMoney(giftChargedLine, curr)}</span>,
                          (item.original_line_price > giftChargedLine)
                            ? <span key="gorig" class="cartmax-line-price-original">{formatMoney(item.original_line_price, curr)}</span>
                            : null,
                          // Still a gift line (no qty selector / switcher), but
                          // the shopper is being charged — show the truth.
                          <span key="giftbadge" class="cartmax-gift-badge">GIFT</span>,
                        ]
                      : <span class="cartmax-gift-badge">{this._t('free_badge', 'FREE')}</span>))
              : (() => {
                  var compareAtUnit = this._layout.show_compare_price
                    ? this._compareAtCache[String(item.variant_id)]
                    : null;
                  var compareAtLine = compareAtUnit ? compareAtUnit * item.quantity : 0;
                  var strikethrough = (compareAtLine > item.final_line_price)
                    ? compareAtLine
                    : (item.original_line_price > item.final_line_price ? item.original_line_price : 0);
                  var savingsPct = strikethrough > 0
                    ? Math.round((strikethrough - item.final_line_price) / strikethrough * 100)
                    : 0;
                  return [
                    <span key="final">{formatMoney(item.final_line_price, curr)}</span>,
                    strikethrough > 0
                      ? <span key="orig" class="cartmax-line-price-original">{formatMoney(strikethrough, curr)}</span>
                      : null,
                    !isClaimed && savingsPct > 0
                      ? <span key="savings" class="cartmax-line-savings-badge">
                          {layout.line_discount_show_icon ? <IconDiscountBadge /> : null}
                          {fillTemplate(this._t('line_discount_format', '{pct}% off'), { pct: savingsPct })}
                        </span>
                      : null,
                  ];
                })()
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
          {!isFreebie && !isClaimed
            ? <div class="cartmax-line-actions">
                {!variantOnTop ? variantNode : null}
                {showsQuantitySelector(item)
                  ? <div class="cartmax-qty-controls">
                      {textRemove
                        // With a text remove link the minus never becomes a bin:
                        // it stops at 1 and REMOVE does the removing.
                        ? <button
                            class="cartmax-qty-btn"
                            onClick={() => this.queueQuantityChange(item.key, displayQty - 1)}
                            disabled={isRemoving || displayQty <= 1}
                            aria-label="Decrease quantity"
                          ><IconMinus /></button>
                        : <button
                            class="cartmax-qty-btn"
                            onClick={() => displayQty <= 1 ? this.handleRemove(item.key) : this.queueQuantityChange(item.key, displayQty - 1)}
                            disabled={isRemoving}
                            aria-label={displayQty <= 1 ? ('Remove ' + item.product_title) : 'Decrease quantity'}
                          >{displayQty <= 1 ? <IconTrash /> : <IconMinus />}</button>
                      }
                      <span class={'cartmax-qty-value' + (isPending ? ' cartmax-qty-pending' : '')} aria-label={'Quantity ' + displayQty}>
                        {formatQty(displayQty, layout.qty_zero_pad)}
                      </span>
                      <button
                        class="cartmax-qty-btn"
                        onClick={() => this.queueQuantityChange(item.key, displayQty + 1)}
                        disabled={isRemoving}
                        aria-label="Increase quantity"
                      ><IconPlus /></button>
                    </div>
                  : null
                }
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
          {this._text.empty_subtitle ? <p class="cartmax-empty-subtitle">{this._text.empty_subtitle}</p> : null}
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

  async handleClaimAdd(variantId, claimId, gift) {
    var key = 'claim_' + variantId;

    // What the shopper pays for this claimed item, in the store's minor units
    // (0 = free). Stamped onto the line as `_claim_price` (underscore = hidden at
    // checkout) so the line can display the real price instead of always "FREE"
    // — the freebie Function applies the actual discount at checkout, so the cart
    // line's own price stays full until then.
    var claimPriceCents = Math.round((Number(gift && gift.claim_price) || 0) * 100);
    var props = { _freebie: 'true', _cartmax_claim: 'true', _claimed: 'true', _offer_id: claimId };
    if (claimPriceCents > 0) props._claim_price = String(claimPriceCents);

    if (this._graphqlCart) {
      this.setState({ claimed: Object.assign({}, this.state.claimed, { [key]: true }) });
      gqlAddLine(variantId, 1, props, {});
      tracker.track(ANALYTICS_EVENTS.GIFT_CLAIMED, { promotion_id: claimId, promotion_type: 'claim-gift', variant_id: String(variantId) });
      return;
    }

    if (this._ajaxStore) {
      this.setState({ claimed: Object.assign({}, this.state.claimed, { [key]: true }) });
      ajaxAddLine(variantId, 1, props,
        { price: 0, title: gift && gift.title, product_title: gift && gift.title, image: gift && gift.image });
      tracker.track(ANALYTICS_EVENTS.GIFT_CLAIMED, { promotion_id: claimId, promotion_type: 'claim-gift', variant_id: String(variantId) });
      return;
    }

    // Optimistically add the gift line NOW (instant), then run the real
    // /cart/add in the background. _stabiliseOrder promotes this pending line to
    // the real Shopify line on reconcile; on inventory rejection we roll it back
    // out and surface the error.
    this._clearClaimError(key);
    var pendingLine = buildPendingGiftLine(variantId, 1, props, gift && gift.title, gift && gift.image, 'pending_claim_');
    var base = this.state.cart || { items: [] };
    var optimisticItems = (base.items || []).concat([pendingLine]);
    var optimisticCount = 0;
    for (var oi = 0; oi < optimisticItems.length; oi++) optimisticCount += (optimisticItems[oi].quantity || 0);
    this._cartReadSeq++;
    this.setState({
      cart: Object.assign({}, base, { items: optimisticItems, item_count: optimisticCount }),
      claimed: Object.assign({}, this.state.claimed, { [key]: true }),
      updating: Object.assign({}, this.state.updating, { [key]: true }),
    });
    updateCartCount(optimisticCount);

    var op = (async () => {
      var added = false;
      try {
        await internalFetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: Number(variantId), quantity: 1, properties: props }),
        });
        added = true;
      } catch (err) {
        // The ADD itself failed (e.g. out of stock) — roll the optimistic line
        // back out and revert the button.
        this._removePendingLine(pendingLine.key);
        var nextClaimed = Object.assign({}, this.state.claimed);
        delete nextClaimed[key];
        this.setState({ claimed: nextClaimed });
        this._showClaimError(key, 'Out of stock');
        console.error('[cartx] Claim add error:', err);
      }
      // Post-add reconcile is best-effort: a failure here must NOT roll back a
      // gift that was actually added (that was the spurious-revert bug).
      if (added) {
        try {
          var cart = await fetchCart();
          this._currency = cart.currency || this._currency;
          window.dispatchEvent(new CustomEvent('cartmax:cart-changed', { detail: { cart: cart } }));
          tracker.track(ANALYTICS_EVENTS.GIFT_CLAIMED, {
            promotion_id: claimId,
            promotion_type: 'claim-gift',
            variant_id: String(variantId),
            cart_total: cart.total_price,
            item_count: cart.item_count,
          });
        } catch (e) { /* add already succeeded; ignore reconcile error */ }
      }
      var newUpdating = Object.assign({}, this.state.updating);
      delete newUpdating[key];
      this.setState({ updating: newUpdating });
    })();
    this._trackOp(op);
    await op;
  }

  // Remove an optimistic pending line (used to roll back a gift that the server
  // rejected, e.g. out of stock).
  _removePendingLine(pendingKey) {
    var c = this.state.cart;
    if (!c || !c.items) return;
    var filtered = c.items.filter(function (it) { return it.key !== pendingKey; });
    if (filtered.length === c.items.length) return;
    var cnt = 0;
    for (var i = 0; i < filtered.length; i++) cnt += (filtered[i].quantity || 0);
    this._cartReadSeq++;
    this.setState({ cart: Object.assign({}, c, { items: filtered, item_count: cnt }) });
    updateCartCount(cnt);
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
  async handleOfferDisplayAdd(variantId, offerId, quantity, gift) {
    var key = 'offer_' + variantId;

    if (this._graphqlCart) {
      this.setState({ claimed: Object.assign({}, this.state.claimed, { [key]: true }) });
      gqlAddLine(variantId, quantity || 1, { _freebie: 'true', _offer_id: offerId, _acquired_on_page: window.location.pathname }, {});
      return;
    }

    if (this._ajaxStore) {
      this.setState({ claimed: Object.assign({}, this.state.claimed, { [key]: true }) });
      ajaxAddLine(variantId, quantity || 1, { _freebie: 'true', _offer_id: offerId, _acquired_on_page: window.location.pathname },
        { price: 0, title: gift && gift.title, product_title: gift && gift.title, image: gift && gift.image });
      return;
    }

    // Optimistically add the gift line NOW; the real /cart/add runs in the
    // background and reconciles via _stabiliseOrder. Roll back on OOS.
    this._clearClaimError(key);
    var props = { _freebie: 'true', _offer_id: offerId, _acquired_on_page: window.location.pathname };
    var pendingLine = buildPendingGiftLine(variantId, quantity || 1, props, gift && gift.title, gift && gift.image, 'pending_offer_');
    var base = this.state.cart || { items: [] };
    var optimisticItems = (base.items || []).concat([pendingLine]);
    var optimisticCount = 0;
    for (var oi = 0; oi < optimisticItems.length; oi++) optimisticCount += (optimisticItems[oi].quantity || 0);
    this._cartReadSeq++;
    this.setState({
      cart: Object.assign({}, base, { items: optimisticItems, item_count: optimisticCount }),
      claimed: Object.assign({}, this.state.claimed, { [key]: true }),
      updating: Object.assign({}, this.state.updating, { [key]: true }),
    });
    updateCartCount(optimisticCount);

    var op = (async () => {
      var added = false;
      try {
        await internalFetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: Number(variantId), quantity: quantity || 1, properties: props }),
        });
        added = true;
      } catch (err) {
        this._removePendingLine(pendingLine.key);
        var nextClaimed = Object.assign({}, this.state.claimed);
        delete nextClaimed[key];
        this.setState({ claimed: nextClaimed });
        this._showClaimError(key, 'Out of stock');
        console.error('[cartx] Offer display add error:', err);
      }
      // Post-add reconcile is best-effort — never roll back a successful add.
      if (added) {
        try {
          var cart = await fetchCart();
          this._currency = cart.currency || this._currency;
          window.dispatchEvent(new CustomEvent('cartmax:cart-changed', { detail: { cart: cart } }));
        } catch (e) { /* add already succeeded; ignore reconcile error */ }
      }
      var newUpdating = Object.assign({}, this.state.updating);
      delete newUpdating[key];
      this.setState({ updating: newUpdating });
    })();
    this._trackOp(op);
    await op;
  }

  renderOfferDisplays() {
    var result = this.state.evalResult;
    if (!result) return null;
    var groups = result.offer_displays || [];
    if (groups.length === 0) return null;

    var self = this;
    var heading = this._text.offer_cards_heading || 'Pick your free gift';
    var cart = this.state.cart;
    var curr = this._currency;
    var addLabel = this._t('gift_add_button', 'Add');
    var removeLabel = this._t('gift_remove_button', 'Remove');
    var addingLabel = this._t('gift_adding', 'Adding...');
    var unavailableLabel = this._t('gift_unavailable', 'Unavailable');
    var claimedLabel = this._t('gift_claimed', 'Claimed');
    var freeLabel = this._t('gift_free_label', 'Free');
    var showPrice = this._layout.gift_show_price;
    function isInCart(vid) {
      if (!cart || !cart.items) return false;
      return cart.items.some(function (item) {
        return String(item.variant_id) === String(vid);
      });
    }

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
                  // Drive off the live cart, not the server's g.in_cart — the
                  // latter lags a round-trip and left the "Remove" button stuck
                  // after an instant optimistic removal.
                  var inCart = isInCart(vid);
                  var showClaimedBtn = isClaimedOptimistic && !inCart;
                  // "~~₹999~~ Free": the compare-at price, else the price. Offers
                  // saved before prices were stored have neither; show the title only.
                  var price = Number(g.price) || 0;
                  var compareAt = Number(g.compare_at_price) || 0;
                  var struck = compareAt > price ? compareAt : price;
                  return (
                    <div class={'cartmax-claim-card' + (inCart ? ' cartmax-claim-card--in-cart' : '')} key={group.offer_id + ':' + vid}>
                      {g.image
                        ? <img class="cartmax-claim-img" src={resizeImage(g.image, 96)} alt={g.title} loading="lazy" />
                        : <div class="cartmax-claim-img-placeholder"><span class="visually-hidden">No image</span></div>
                      }
                      <div class="cartmax-claim-info">
                        {g.title ? <div class="cartmax-claim-title">{g.title}</div> : null}
                        {showPrice && struck > 0
                          ? <div class="cartmax-claim-price">
                              <span class="cartmax-claim-price-original">{formatMoney(Math.round(struck * 100), curr)}</span>
                              <span class="cartmax-claim-price-free">{freeLabel}</span>
                            </div>
                          : null
                        }
                        {inCart
                          ? <button
                              class="cartmax-claim-btn cartmax-claim-btn--remove"
                              onClick={function () { self.handleClaimRemove(vid); }}
                            >{removeLabel}</button>
                          : showClaimedBtn
                            ? <button
                                class="cartmax-claim-btn cartmax-claim-btn--claimed"
                                disabled
                              ><IconCheck /> {claimedLabel}</button>
                            : <button
                                class="cartmax-claim-btn cartmax-claim-btn--add"
                                onClick={function () { self.handleOfferDisplayAdd(vid, group.offer_id, group.quantity_per_variant, { title: g.title, image: g.image }); }}
                                disabled={isAdding || !g.available}
                              >{isAdding ? addingLabel : (!g.available ? unavailableLabel : addLabel)}</button>
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
    var claimLabel = this._t('claim_gift_button', 'Claim gift');
    var removeLabel = this._t('gift_remove_button', 'Remove');
    var addingLabel = this._t('gift_adding', 'Adding...');
    var unavailableLabel = this._t('gift_unavailable', 'Unavailable');
    var limitLabel = this._t('claim_limit_reached', 'Limit reached');
    var claimedLabel = this._t('gift_claimed', 'Claimed');

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
            // Live cart is the source of truth (see offer card note) — avoids a
            // stale "Remove" button after an instant optimistic removal.
            var inCart = isInCart(vid);
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
                      >{removeLabel}</button>
                    : showClaimedBtn
                      ? <button
                          class="cartmax-claim-btn cartmax-claim-btn--claimed"
                          disabled
                        ><IconCheck /> {claimedLabel}</button>
                      : <button
                          class="cartmax-claim-btn cartmax-claim-btn--add"
                          onClick={function () { self.handleClaimAdd(vid, cg._rule_id, { title: g.title, image: g.image, claim_price: cg.claim_price }); }}
                          disabled={isClaiming || !g.available || limitReached}
                        >{isClaiming ? addingLabel : (!g.available ? unavailableLabel : (limitReached ? limitLabel : claimLabel))}</button>
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

  // The codes Shopify has actually ACCEPTED. Authoritative source is
  // cart.discount_codes[].applicable (present on /cart.js + /cart/update.js),
  // which covers cart-level AND line-level codes and excludes rejected ones.
  // Falls back to reading discount applications for older cart shapes.
  getAppliedCodes() {
    var cart = this.state.cart;
    if (!cart) return [];
    // discount_codes is the authoritative list of CODES the shopper entered
    // (always present on /cart.js; may be empty). An EMPTY array means no codes —
    // we must return [] here and NOT fall through to reading discount-application
    // titles, which also include AUTOMATIC / Shopify Function discounts (e.g. the
    // freebie discount titled "Claimed Gift") that would be mistaken for coupons.
    if (cart.discount_codes) {
      return cart.discount_codes
        .filter(function (d) { return d.applicable; })
        .map(function (d) { return d.code; });
    }
    // Fallback only for a cart shape lacking discount_codes: discount-CODE
    // applications ONLY (never automatic ones).
    var codes = [];
    (cart.cart_level_discount_applications || []).forEach(function (d) {
      if (d.title && d.type === 'discount_code') codes.push(d.title);
    });
    (cart.items || []).forEach(function (item) {
      (item.line_level_discount_allocations || []).forEach(function (a) {
        var da = a.discount_application;
        if (da && da.title && da.type === 'discount_code') codes.push(da.title);
      });
    });
    return codes.filter(function (c, i, arr) { return arr.indexOf(c) === i; });
  }

  // Did `code` actually get applied to `cart`? Authoritative signal is
  // /cart.js discount_codes[].applicable; fall back to the real discount
  // applications. Used to reject invalid/inapplicable codes instead of silently
  // banking them.
  _couponApplied(cart, code) {
    if (!cart || !code) return false;
    var up = code.toUpperCase();
    var dc = cart.discount_codes || [];
    for (var i = 0; i < dc.length; i++) {
      if (dc[i].code && dc[i].code.toUpperCase() === up) return !!dc[i].applicable;
    }
    var atCart = (cart.cart_level_discount_applications || []).some(function (d) {
      return d.title && d.title.toUpperCase() === up;
    });
    if (atCart) return true;
    return (cart.items || []).some(function (item) {
      return (item.line_level_discount_allocations || []).some(function (a) {
        return a.discount_application && a.discount_application.title &&
          a.discount_application.title.toUpperCase() === up;
      });
    });
  }

  // Feed an authoritative /cart.js cart (from a direct coupon update.js call)
  // back into the live cart system, so the drawer + store stay in sync WITHOUT
  // any optimistic discount overlay.
  // Show a coupon error that auto-dismisses (same hold as other inline errors),
  // so a stale "Invalid or inapplicable code" doesn't linger on screen.
  _flashCouponError(message) {
    if (this._couponErrTimer) clearTimeout(this._couponErrTimer);
    this.setState({ couponError: message });
    this._couponErrTimer = setTimeout(() => {
      this._couponErrTimer = null;
      this.setState({ couponError: null });
    }, INLINE_ERROR_HOLD_MS);
  }

  _clearCouponError() {
    if (this._couponErrTimer) { clearTimeout(this._couponErrTimer); this._couponErrTimer = null; }
    if (this.state.couponError) this.setState({ couponError: null });
  }

  _applyCouponCart(cart) {
    if (this._ajaxStore) ajaxReconcile(cart, true);
    // Update the footer "you saved {amount}" instantly from the authoritative
    // cart (same formula as the server's computeTotalSavings), rather than
    // waiting on the debounced promo eval.
    var savings = Math.max(0, (cart.original_total_price || 0) - (cart.total_price || 0));
    this.setState({ cart: cart, savings: savings });
    updateCartCount(cart.item_count);
    window.dispatchEvent(new CustomEvent('cartmax:cart-action', { detail: { cart: cart } }));
  }

  async handleCouponApply(code) {
    if (!code || !code.trim()) return;
    var newCode = code.trim();
    if (this._graphqlCart) {
      gqlApplyCoupon(newCode);
      this.setState({ couponInput: '', couponPanelOpen: false, couponError: null });
      return;
    }
    // Coupons are NEVER optimistic (AJAX store + legacy). A real, validated
    // /cart/update.js call: send only the currently-APPLIED codes plus the new
    // one. If Shopify doesn't actually apply the new code, reset the set to the
    // applied codes so a rejected code is never banked (which is what caused
    // random codes to pile up in the discount payload).
    if (this.getAppliedCodes().some(function (c) { return c.toUpperCase() === newCode.toUpperCase(); })) {
      this.setState({ couponInput: '', couponPanelOpen: false, couponError: null });
      return;
    }
    this.setState({ couponLoading: true, couponError: null });
    try {
      var allowMultiple = this._sections.allow_multiple_coupons;
      var applied = this.getAppliedCodes();
      // Multi-coupon mode APPENDS to the applied set; single-coupon mode REPLACES
      // (base = none). Computing the target set up front means a successful apply
      // is ONE /cart/update.js + ONE /cart.js — no extra "replace" round-trip.
      var base = allowMultiple ? applied : [];
      var sendStr = base.concat([newCode]).join(',');
      await cartUpdateAll({ discount: sendStr });
      // /cart/update.js response omits settled discount allocations; /cart.js has
      // them (needed for the price breakup), so read it back once.
      var cart = await fetchCart();
      var didApply = this._couponApplied(cart, newCode);
      if (!didApply) {
        // Rejected → restore the previously-applied set; never bank a bad code.
        await cartUpdateAll({ discount: applied.join(',') });
        cart = await fetchCart();
      }
      this._currency = cart.currency || this._currency;
      this._applyCouponCart(cart);
      this.setState({
        couponLoading: false,
        couponInput: '',
        couponPanelOpen: didApply ? false : this.state.couponPanelOpen,
      });
      if (didApply) this._clearCouponError();
      else this._flashCouponError(this._t('coupon_invalid', 'Invalid or inapplicable code'));
      tracker.track(
        didApply ? ANALYTICS_EVENTS.COUPON_APPLIED : ANALYTICS_EVENTS.COUPON_REJECTED,
        { promotion_type: 'coupon', code: newCode, reason: didApply ? null : 'not_applicable',
          cart_total: cart.total_price, item_count: cart.item_count },
      );
    } catch (err) {
      this.setState({ couponLoading: false });
      this._flashCouponError('Failed to apply coupon');
      tracker.track(ANALYTICS_EVENTS.COUPON_REJECTED, {
        promotion_type: 'coupon', code: newCode, reason: 'request_failed',
      });
    }
  }

  async handleCouponRemove(codeToRemove) {
    if (this._graphqlCart) {
      gqlRemoveCoupon(codeToRemove);
      return;
    }
    // Non-optimistic: re-send the remaining applied codes via a real
    // /cart/update.js call, then reconcile from the authoritative result.
    this.setState({ couponLoading: true });
    try {
      var removeUpper = (codeToRemove || '').toUpperCase();
      var remaining = this.getAppliedCodes().filter(function (c) { return c.toUpperCase() !== removeUpper; });
      await cartUpdateAll({ discount: remaining.join(',') });
      var cart = await fetchCart();   // fresh /cart.js — complete discount allocations
      this._currency = cart.currency || this._currency;
      this._applyCouponCart(cart);
      this.setState({ couponLoading: false, couponError: null });
    } catch (err) {
      this.setState({ couponLoading: false });
    }
  }

  // Applied coupon chips. Driven by cart.discount_codes (applicable === true) so
  // a code that applies at the LINE level — not just cart level — still shows a
  // chip. Amounts (when the code produces a cart-level allocation) are looked up
  // by title. Falls back to cart-level discount_code applications.
  getAppliedDiscounts() {
    var cart = this.state.cart;
    if (!cart) return [];
    var amounts = {};
    (cart.cart_level_discount_applications || []).forEach(function (d) {
      if (d.title) amounts[d.title.toUpperCase()] = d.total_allocated_amount || 0;
    });
    if (cart.discount_codes && cart.discount_codes.length) {
      return cart.discount_codes
        .filter(function (d) { return d.applicable; })
        .map(function (d) { return { code: d.code, amount: amounts[(d.code || '').toUpperCase()] || 0 }; });
    }
    var codes = [];
    (cart.cart_level_discount_applications || []).forEach(function (d) {
      if (d.title && d.type === 'discount_code') {
        codes.push({ code: d.title, amount: d.total_allocated_amount || 0 });
      }
    });
    return codes;
  }

  // Coupons to SHOW, split into the ones the cart meets the minimum for and
  // (when "show locked coupons" is on) the ones it doesn't yet. Applied codes are
  // left out of both. Shared by the in-body block and the slide-in panel.
  _couponLists() {
    var evalResult = this.state.evalResult;
    var appliedCodes = this.getAppliedDiscounts().map(function (d) { return d.code; });
    var allCoupons = (evalResult && evalResult.available_coupons) ? evalResult.available_coupons : [];
    return splitCoupons(allCoupons, this.state.cart, appliedCodes, this._sections.show_locked_coupons);
  }

  // One coupon card. `kind` picks the class family: 'discount' in the cart body,
  // 'offers' in the panel, so each keeps its own styling.
  renderCouponCard(c, kind, isLoading) {
    var self = this;
    var base = 'cartmax-' + kind + '-card';
    var gap = c._shortfall;
    var lockedMsg = null;
    if (gap) {
      lockedMsg = gap.by === 'price'
        ? fillTemplate(this._t('coupon_locked_message', 'Add {amount} more to apply this coupon'), { amount: formatMoney(gap.amount, this._currency) })
        : fillTemplate(this._t('coupon_locked_qty_message', 'Add {count} more items to apply this coupon'), { count: gap.count });
    }
    return (
      <div class={base + (gap ? ' ' + base + '--locked' : '')} key={c.code}>
        <div class={base + '-accent'}>
          <span>{c.accent}</span>
        </div>
        <div class={base + '-info'}>
          <span class={base + '-code'}>{c.code}</span>
          {gap
            ? <span class={base + '-locked-msg'}>{lockedMsg}</span>
            : <span class={base + '-savings'}>{c.display_message}</span>
          }
        </div>
        {gap
          ? null
          : <button
              class={base + '-btn'}
              onClick={function () { self.handleCouponApply(c.code); }}
              disabled={isLoading}
            >{this._t('coupon_apply', 'Apply')}</button>
        }
      </div>
    );
  }

  // Applied codes as full cards (REMOVE + "You saved ₹X"), the alternative to
  // the compact chips. The accent and message come from the matching cartx
  // coupon when there is one; a code typed in by hand shows just the code.
  renderAppliedCards(appliedDiscounts, isLoading) {
    var self = this;
    var cart = this.state.cart;
    var evalResult = this.state.evalResult;
    var configured = (evalResult && evalResult.available_coupons) || [];
    var savedTpl = this._t('coupon_saved_message', 'You saved {amount} with this coupon');
    var removeLabel = this._t('coupon_remove', 'Remove');
    return (
      <div class="cartmax-applied-cards">
        {appliedDiscounts.map(function (d) {
          var up = String(d.code || '').toUpperCase();
          var cfg = configured.find(function (c) { return String(c.code || '').toUpperCase() === up; }) || {};
          var saved = savingsForCode(cart, d.code);
          return (
            <div class="cartmax-applied-card" key={d.code}>
              <div class="cartmax-discount-card cartmax-discount-card--applied">
                {cfg.accent
                  ? <div class="cartmax-discount-card-accent"><span>{cfg.accent}</span></div>
                  : null
                }
                <div class="cartmax-discount-card-info">
                  <span class="cartmax-discount-card-code">{d.code}</span>
                  {cfg.display_message ? <span class="cartmax-discount-card-savings">{cfg.display_message}</span> : null}
                </div>
                <button
                  class="cartmax-discount-card-btn cartmax-discount-card-btn--remove"
                  onClick={function () { self.handleCouponRemove(d.code); }}
                  disabled={isLoading}
                  aria-label={'Remove ' + d.code}
                >{removeLabel}</button>
              </div>
              {saved > 0
                ? <div class="cartmax-applied-saved">
                    <IconCheck />
                    <span>{fillTemplate(savedTpl, { amount: formatMoney(saved, self._currency) })}</span>
                  </div>
                : null
              }
            </div>
          );
        })}
      </div>
    );
  }

  renderCoupons() {
    var self = this;
    var isLoading = this.state.couponLoading;
    var appliedDiscounts = this.getAppliedDiscounts();
    var lists = this._couponLists();
    var cards = lists.available.concat(lists.locked);
    var asLink = this._layout.coupon_entry === 'link';
    // The input used to ignore this setting and always say "Apply Coupon", while
    // configs saved the old default "Discount code". Treat that untouched old
    // default as unset so existing stores keep the text they've always shown.
    var placeholderSetting = this._text.coupon_placeholder === 'Discount code' ? '' : this._text.coupon_placeholder;
    var placeholder = placeholderSetting || 'Apply Coupon';

    // Input row + "View All" stay visible even when a coupon is applied, so the
    // shopper can always open the coupon drawer (or apply another where allowed).
    // Applied coupons render as compact chips with a remove (✕), or as full cards.
    return (
      <div class="cartmax-coupons">
        <div class="cartmax-discount-block">
          {asLink
            ? <button
                class="cartmax-coupon-link"
                onClick={function () { self.setState({ couponPanelOpen: true }); }}
              >
                <span class="cartmax-coupon-link-icon"><IconTag /></span>
                <span class="cartmax-coupon-link-label">{placeholder}</span>
                <span class="cartmax-coupon-link-chevron"><IconChevronRight /></span>
              </button>
            : <div class="cartmax-discount-input-row">
                <input
                  class="cartmax-discount-input"
                  type="text"
                  placeholder={placeholder}
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
                >{this._t('coupon_view_all', 'View All')}</button>
              </div>
          }
          {self.state.couponError && !self.state.couponPanelOpen
            ? <div class="cartmax-coupon-error">{self.state.couponError}</div>
            : null
          }

          {appliedDiscounts.length > 0 && this._sections.coupon_applied_style === 'card'
            ? this.renderAppliedCards(appliedDiscounts, isLoading)
            : null
          }
          {appliedDiscounts.length > 0 && this._sections.coupon_applied_style !== 'card' ? (
            <div class="cartmax-applied-chips">
              {appliedDiscounts.map(function (d) {
                return (
                  <div class="cartmax-applied-chip" key={d.code}>
                    <span class="cartmax-applied-chip-check"><IconCheck /></span>
                    <span class="cartmax-applied-chip-code">{d.code}</span>
                    <button
                      class="cartmax-applied-chip-remove"
                      onClick={function () { self.handleCouponRemove(d.code); }}
                      disabled={isLoading}
                      aria-label={'Remove ' + d.code}
                    ><IconClose /></button>
                  </div>
                );
              })}
            </div>
          ) : null}

          {cards.length > 0 ? (
            <div class={'cartmax-discount-cards' + (this._layout.coupon_cards_layout === 'list' ? ' cartmax-discount-cards--list' : '')}>
              {cards.map(function (c) { return self.renderCouponCard(c, 'discount', isLoading); })}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // The slide-in "Offers & Coupons" panel. Rendered as a direct child of the
  // drawer root (NOT inside the scrollable body) so its absolute inset:0 overlays
  // the whole drawer — including the header — regardless of body scroll position.
  // (Nesting it in the scrolled body was pushing its header/back button up under
  // the cart header on mobile.)
  renderCouponsPanel() {
    var self = this;
    var isLoading = this.state.couponLoading;
    var showPanel = this.state.couponPanelOpen;
    var lists = this._couponLists();
    var cards = lists.available.concat(lists.locked);
    return (
      <div class={'cartmax-offers-panel' + (showPanel ? ' cartmax-offers-panel--open' : '')}>
        <div class="cartmax-offers-panel-header">
          <button
            class="cartmax-offers-back"
            onClick={function () { self.setState({ couponPanelOpen: false }); }}
            aria-label="Back to cart"
          ><IconChevronLeft /></button>
          <span class="cartmax-offers-title">{this._t('coupons_panel_title', 'Offers & Coupons')}</span>
        </div>
        <div class="cartmax-offers-body">
          {this._sections.coupon_panel_input ? (
            <div class="cartmax-offers-input-wrap">
              <div class="cartmax-offers-input-row">
                <input
                  class="cartmax-offers-input"
                  type="text"
                  placeholder={this._t('coupons_panel_placeholder', 'Enter Coupon Code')}
                  value={self.state.couponInput || ''}
                  onInput={function (e) { self.setState({ couponInput: e.target.value, couponError: null }); }}
                  onKeyDown={function (e) { if (e.key === 'Enter') self.handleCouponApply(self.state.couponInput); }}
                  disabled={isLoading}
                />
                <button
                  class="cartmax-offers-input-btn"
                  onClick={function () { self.handleCouponApply(self.state.couponInput); }}
                  disabled={isLoading || !(self.state.couponInput || '').trim()}
                >{this._t('coupon_apply', 'Apply')}</button>
              </div>
              {self.state.couponError && showPanel
                ? <div class="cartmax-coupon-error">{self.state.couponError}</div>
                : null
              }
            </div>
          ) : null}
          <span class="cartmax-offers-label">{this._t('coupons_panel_label', 'Available Coupons')}</span>
          {cards.length > 0 ? (
            <div class="cartmax-offers-cards">
              {cards.map(function (c) { return self.renderCouponCard(c, 'offers', isLoading); })}
            </div>
          ) : null}
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
  // `card` carries where the recommendation came from. It rides on the line as
  // the hidden `_cartx_upsell` property so order attribution can credit upsell
  // revenue, and on the analytics events (same `upsell:<product_id>` id as the
  // card impression, which feeds the performance ranking).
  async handleUpsellAdd(variantId, productMeta, card) {
    var c = card || {};
    var props = { _cartx_upsell: c.source === 'rule' ? 'rule:' + c.trigger_product_id : (c.source || 'default') };
    var addedProps = {
      promotion_id: c.product_id ? 'upsell:' + c.product_id : undefined,
      promotion_type: 'upsell',
      promotion_name: (productMeta && productMeta.title) || undefined,
      variant_id: String(variantId),
      product_id: c.product_id,
      source: c.source,
      trigger_product_id: c.trigger_product_id,
      position: c.position,
    };
    if (this._graphqlCart || this._ajaxStore) {
      var meta = {
        price: Math.round(Number((productMeta && productMeta.price) || 0) * 100),
        title: productMeta && productMeta.title,
        product_title: productMeta && productMeta.title,
        variant_title: productMeta && productMeta.variant_title,
        image: productMeta && productMeta.image,
        // product_id lets the recommendations drop this card and show its own
        // rules from the optimistic cart, before the server confirms the add.
        product_id: productMeta && productMeta.product_id,
      };
      if (this._graphqlCart) gqlAddLine(variantId, 1, props, meta);
      else ajaxAddLine(variantId, 1, props, meta);
      tracker.track(ANALYTICS_EVENTS.UPSELL_ADDED, addedProps);
      return;
    }
    var key = 'upsell_' + variantId;
    var snapshot = this.state.cart;

    this.setState({ updating: Object.assign({}, this.state.updating, { [key]: true }) });

    if (productMeta && snapshot) {
      var unitPriceCents = Math.round(Number(productMeta.price || 0) * 100);
      var optimisticItem = {
        key: 'pending_upsell_' + variantId + '_' + Date.now(),
        variant_id: Number(variantId),
        product_id: productMeta.product_id != null ? Number(productMeta.product_id) : null,
        quantity: 1,
        price: unitPriceCents,
        line_price: unitPriceCents,
        final_line_price: unitPriceCents,
        original_line_price: unitPriceCents,
        product_title: productMeta.title || '',
        title: productMeta.title || '',
        image: productMeta.image || '',
        variant_title: productMeta.variant_title || '',
        properties: props,
        line_level_discount_allocations: [],
      };
      dispatchOptimistic(simulateAdd(snapshot, optimisticItem));
    }

    try {
      await internalFetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(variantId), quantity: 1, properties: props }),
      });
      var cart = await fetchCart();
      this._currency = cart.currency || this._currency;
      window.dispatchEvent(new CustomEvent('cartmax:internal-reload', { detail: { cart: cart } }));
      window.dispatchEvent(new CustomEvent('cartmax:cart-changed', { detail: { cart: cart } }));
      tracker.track(ANALYTICS_EVENTS.UPSELL_ADDED, Object.assign({}, addedProps, {
        cart_total: cart.total_price,
        item_count: cart.item_count,
      }));
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

  // One Storefront API call per batch of unchecked products (or
  // /products/{handle}.js without a token); each product once per session.
  _ensureUpsellAvailability(cards) {
    var self = this;
    var need = (cards || []).filter(function (c) {
      return c.product_id && !self._upsellAvailRequested[c.product_id];
    });
    if (need.length === 0) return;
    need.forEach(function (c) { self._upsellAvailRequested[c.product_id] = true; });
    var apply = function (map) {
      var changed = false;
      for (var pid in map) {
        if (!Object.prototype.hasOwnProperty.call(map, pid)) continue;
        self._upsellAvail[pid] = map[pid];
        changed = true;
      }
      if (changed) self.setState({});
    };
    var byHandle = function () {
      return Promise.all(need.map(function (c) {
        if (!c.handle) return null;
        return fetch('/products/' + c.handle + '.js')
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (data) {
            if (!data || !data.variants) return null;
            var first = null;
            for (var i = 0; i < data.variants.length; i++) {
              if (data.variants[i].available) { first = data.variants[i]; break; }
            }
            return [c.product_id, { available: !!first, variantId: first ? String(first.id) : null }];
          })
          .catch(function () { return null; });
      })).then(function (pairs) {
        var map = {};
        pairs.forEach(function (p) { if (p) map[p[0]] = p[1]; });
        return map;
      });
    };
    var run = isStorefrontReady()
      ? fetchProductAvailability(need.map(function (c) { return c.product_id; })).catch(byHandle)
      : byHandle();
    // On failure the cards stay addable (availability unknown), never hidden.
    run.then(apply).catch(function (err) { console.error('[cartx] upsell availability check failed:', err); });
  }

  // Top the candidates up with Shopify's own recommendations. This is the
  // storefront's unauthenticated endpoint, so there's no backend involved; it
  // only returns useful results when the merchant has Search & Discovery set up,
  // hence opt-in with a silent fallback to the candidates alone.
  _ensureUpsellRecs(strategies, items, needed) {
    var cfg = (strategies && strategies.shopify_recs) || {};
    if (!cfg.enabled || needed <= 0 || items.length === 0) return;

    // Seed from the highest-value line the shopper is actually paying for —
    // their strongest signal of intent. Gift lines say nothing about taste.
    var seed = null;
    var best = -1;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (hasFreebieMarker(it.properties)) continue;
      var value = it.final_line_price || 0;
      if (value > best) { best = value; seed = it; }
    }
    if (!seed || !seed.product_id) return;

    var intent = cfg.intent || 'complementary';
    var key = String(seed.product_id) + ':' + intent;
    if (this._recsFetched[key]) return;
    this._recsFetched[key] = true;

    var limit = Math.max(1, Math.min(8, cfg.max_fill || 2));
    var url = '/recommendations/products.json?product_id=' + encodeURIComponent(seed.product_id)
      + '&limit=' + limit + '&intent=' + intent;
    var self = this;
    fetch(url)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var products = (data && data.products) || [];
        if (products.length === 0) return;
        self._recsPool = products.map(function (prod) {
          var variant = (prod.variants && prod.variants[0]) || {};
          // Storefront JSON prices are in minor units; the candidates store
          // major units, and the ranking compares against major-unit thresholds.
          var minor = variant.price != null ? variant.price : prod.price;
          return {
            product_id: String(prod.id),
            variant_id: String(variant.id || ''),
            title: prod.title,
            handle: prod.handle,
            image_url: prod.featured_image || (prod.images && prod.images[0]) || '',
            price: String((Number(minor) || 0) / 100),
          };
        }).filter(function (prod) { return prod.variant_id; });
        if (self._recsPool.length > 0) self.setState({});
      })
      .catch(function (err) { console.error('[cartx] Shopify recommendations fetch failed:', err); });
  }

  // The upsell cards for the current cart, re-selected from the live cart on
  // every render with the same pure functions the server used (candidates from
  // the rules and default list, then ranking), so adding a recommendation swaps
  // in its own recommendations and the unlock CTA tracks the cart instantly.
  _upsellCards(upsells, items, bar) {
    var unavailable = {};
    for (var pid in this._upsellAvail) {
      if (Object.prototype.hasOwnProperty.call(this._upsellAvail, pid) && this._upsellAvail[pid].available === false) {
        unavailable[pid] = true;
      }
    }
    if (upsells.settings) {
      var settings = upsells.settings;
      var input = {
        items: items,
        rules: upsells.rules || {},
        catalog: upsells.catalog || {},
        defaults: upsells.defaults || [],
        settings: settings,
        bar: bar,
        addRates: upsells.add_rates || {},
      };
      var max = settings.max_visible || 4;
      // Check stock for twice the cap so hidden sold-out cards can be backfilled.
      var candidates = pickRecommendations(Object.assign({}, input, { limit: max * 2 }));
      this._ensureUpsellAvailability(candidates.concat(this._recsPool));
      // Recommendations top up existing candidates; they never invent a list.
      if (candidates.length > 0) this._ensureUpsellRecs(settings.strategies, items, max - candidates.length);
      return {
        cards: selectUpsells(Object.assign({}, input, { unavailable: unavailable, extraPool: this._recsPool })),
        showSoldOut: settings.sold_out === 'show',
        strategies: settings.strategies || {},
      };
    }
    // Server predating cart-based upsells: its list, minus variants in the cart.
    var cartVariantIds = items.map(function (i) { return String(i.variant_id); });
    var cards = (upsells.products || []).map(function (p) {
      return Object.assign({}, p, {
        product_id: String(p.product_id).split('/').pop(),
        variant_id: String(p.variant_id).split('/').pop(),
        source: 'default',
        trigger_product_id: null,
      });
    }).filter(function (p) { return cartVariantIds.indexOf(p.variant_id) === -1; });
    this._ensureUpsellAvailability(cards);
    return { cards: cards, showSoldOut: true, strategies: upsells.strategies || {} };
  }

  renderUpsells() {
    var result = this.state.evalResult;
    if (!result || !result.upsells || !result.upsells.enabled) return null;

    var cart = this.state.cart;
    var items = (cart && cart.items) || [];
    if (items.length === 0 && this._upsells.show_on_empty !== 'always') return null;

    var picked = this._upsellCards(result.upsells, items, result.bar);
    var cards = picked.cards;
    if (cards.length === 0) return null;

    var curr = this._currency;
    var self = this;
    var u = this._upsells;
    var layoutClass = 'cartmax-upsells--' + (u.card_layout || 'horizontal');
    var sizeClass = 'cartmax-upsell-card--' + (u.card_size || 'medium');
    var headingText = u.heading || 'YOU MAY ALSO LIKE';
    // The empty cart can use its own heading (e.g. "Recommended for you").
    if (items.length === 0 && this._text.upsells_empty_heading) headingText = this._text.upsells_empty_heading;
    var btnText = u.btn_text || 'ADD TO CART';
    var soldOutText = this._t('upsell_sold_out', 'Sold out');
    var discountTpl = this._t('line_discount_format', '{pct}% off');
    var btnOverImage = u.btn_position === 'over_image';
    // Shown instead of the generic label on a product that actually closes the
    // gap to the next milestone — the whole point of the gap-filler strategy.
    var gapCfg = picked.strategies.gap_filler || {};
    var unlockTpl = gapCfg.cta_template || 'Add to unlock [[reward]]';
    var imgPx = { small: 130, medium: 180, large: 230 }[u.card_size] || 180;

    return (
      <div class={'cartmax-upsells ' + layoutClass + (btnOverImage ? ' cartmax-upsells--btn-over-image' : '')}>
        <div class="cartmax-upsells-heading" style={{ justifyContent: u.heading_position === 'center' ? 'center' : 'flex-start' }}>{headingText}</div>
        {this.state.upsellError
          ? <div class="cartmax-upsell-error">{this.state.upsellError}</div>
          : null
        }
        <div class="cartmax-upsells-scroll">
          {cards.map(function (p, i) {
            var avail = self._upsellAvail[p.product_id];
            // Add the first variant that's in stock; the snapshot's first
            // variant until availability is known.
            var vid = String((avail && avail.variantId) || p.variant_id).split('/').pop();
            var isAdding = self.state.updating['upsell_' + vid];
            // Sold out only once availability is known and false — unknown stays
            // addable so the button is never hidden prematurely.
            var soldOut = picked.showSoldOut && !!avail && avail.available === false;
            var productMeta = {
              title: p.title,
              image: p.image_url,
              price: p.price,
              product_id: p.product_id,
            };
            var card = { product_id: p.product_id, source: p.source, trigger_product_id: p.trigger_product_id, position: i + 1 };
            // Merged milestone labels join with a newline; keep the first line.
            var rewardLabel = p._unlocks_tier
              ? String(p._unlocks_tier.label || '').split('\n')[0].trim()
              : '';
            var unlockLabel = p._unlocks_tier
              ? unlockTpl.replace(/\[\[\s*reward\s*\]\]/gi, rewardLabel || 'your reward')
              : null;
            var pct = u.show_discount ? discountPercent(p.price, p.compare_at_price) : 0;
            var img = p.image_url
              ? <img class="cartmax-upsell-img" src={resizeImage(p.image_url, imgPx)} alt={p.title} loading="lazy" />
              : <div class="cartmax-upsell-img-placeholder"><span class="visually-hidden">No image</span></div>;
            var addBtn = (
              <button
                class={'cartmax-upsell-add' + (soldOut ? ' cartmax-upsell-add--soldout' : '')}
                onClick={function () { if (!soldOut) self.handleUpsellAdd(vid, productMeta, card); }}
                disabled={isAdding || soldOut}
              >{soldOut ? soldOutText : (isAdding ? 'Adding...' : (unlockLabel || btnText))}</button>
            );
            return (
              <div
                class={'cartmax-upsell-card ' + sizeClass + (unlockLabel ? ' cartmax-upsell-card--unlocks' : '')}
                key={p.product_id}
                data-cartmax-promo-id={'upsell:' + p.product_id}
                data-cartmax-promo-type="upsell"
                ref={function (el) { self._observePromo(el); }}
              >
                {btnOverImage
                  ? <div class="cartmax-upsell-media">{img}{addBtn}</div>
                  : img
                }
                <div class="cartmax-upsell-info">
                  <div class="cartmax-upsell-title">{p.title}</div>
                  <div class="cartmax-upsell-price">
                    <span class="cartmax-upsell-sale">{formatMoney(Number(p.price) * 100, curr)}</span>
                    {(u.show_compare_price && p.compare_at_price)
                      ? <span class="cartmax-upsell-compare">{formatMoney(Number(p.compare_at_price) * 100, curr)}</span>
                      : null
                    }
                    {pct > 0
                      ? <span class="cartmax-upsell-discount">{fillTemplate(discountTpl, { pct: pct })}</span>
                      : null
                    }
                  </div>
                  {btnOverImage ? null : addBtn}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Checkout validation ───────────────────────────────────
  // On checkout we reconcile the cart (pull any gift whose threshold is no
  // longer met — offer AND claim gifts) and wait for the sync to settle, so a
  // stale gift can never ride through to checkout. This predicate is the final
  // gate: a cart with no payable value is not checkout-able (e.g. only a free
  // gift remains). See _reconcileLocalGifts, which now also pulls claim gifts.

  _isZeroTotal(c) {
    return !c || !c.items || c.items.length === 0 || !(Number(c.total_price) > 0);
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
            {this._layout.savings_show_icon ? <span class="cartmax-footer-savings-icon"><IconSparkle /></span> : null}
            <span>{savingsParts[0]}</span>
            <span class="cartmax-footer-savings-amount">{formatMoney(savings, curr)}</span>
            <span>{savingsParts[1] || ''}</span>
            {this._layout.savings_show_icon ? <span class="cartmax-footer-savings-icon"><IconSparkle /></span> : null}
          </div>
        ) : null}
        <div class="cartmax-footer-checkout">
          <div class="cartmax-footer-price">
            <span class={'cartmax-footer-price-amount' + (this.state.cartSyncing ? ' cartmax-price-updating' : '')}>{formatMoney(cart.total_price, curr)}</span>
            <button
              class="cartmax-price-breakup-link"
              onClick={() => this.setState({ priceBreakupOpen: true })}
            >{this._t('price_breakup_link', 'VIEW PRICE BREAKUP')}</button>
          </div>
          <a
            class={'cartmax-checkout-btn' + (this.state.checkoutWaiting ? ' cartmax-checkout-waiting' : '')}
            href={this._graphqlCart && cart.checkout_url ? cart.checkout_url : '/checkout'}
            onClick={(e) => {
              tracker.persistSessionCookie();
              var checkoutJs = this._behavior.checkout_js;
              var buttonEl = e.currentTarget;
              // GraphQL path: checkout the canonical Storefront cart via its
              // checkoutUrl. Wait for the sync to settle first so the server cart
              // reflects the latest edits, then navigate.
              if (this._graphqlCart) {
                e.preventDefault();
                if (this.state.checkoutWaiting) return;
                this.setState({ checkoutWaiting: true });
                gqlWhenSettled().then(() => {
                  var fresh = gqlGetCart() || cart;
                  this.setState({ checkoutWaiting: false });
                  if (this._isZeroTotal(fresh)) return;
                  var url = (fresh && fresh.checkout_url) || cart.checkout_url;
                  if (checkoutJs) {
                    try { new Function('button', checkoutJs)(buttonEl); } catch (_) { if (url) window.location.href = url; }
                  } else if (url) {
                    window.location.href = url;
                  }
                });
                return;
              }
              // AJAX store path: validate before leaving — reconcile the cart
              // (pull any offer/claim gift whose threshold is no longer met),
              // then wait for the single-flight sync to commit, so /checkout only
              // ever sees a correct, non-zero cart.
              if (this._ajaxStore) {
                e.preventDefault();
                if (this.state.checkoutWaiting) return;
                this.setState({ checkoutWaiting: true });
                this._reconcileLocalGifts(this.state.cart);
                ajaxWhenSettled().then(() => {
                  var fresh = ajaxGetCart() || this.state.cart;
                  this.setState({ checkoutWaiting: false });
                  if (this._isZeroTotal(fresh)) return;
                  if (checkoutJs) {
                    try { new Function('button', checkoutJs)(buttonEl); } catch (_) { window.location.href = '/checkout'; }
                  } else {
                    window.location.href = '/checkout';
                  }
                });
                return;
              }
              var isProcessing = Object.keys(this.state.updating).length > 0 || this._activeOps.size > 0;
              if (isProcessing || this.state.checkoutWaiting) {
                e.preventDefault();
                if (this.state.checkoutWaiting) return;
                this.setState({ checkoutWaiting: true });
                // Wait for in-flight cart mutations (e.g. a just-selected variant)
                // to commit, THEN for the eval pipeline, before leaving — so the
                // server cart we check out reflects the latest edit.
                this.whenCartIdle().then(() => waitForEvaluate()).then(() => {
                  this.setState({ checkoutWaiting: false });
                  if (this._isZeroTotal(this.state.cart)) return;
                  if (checkoutJs) {
                    try { new Function('button', checkoutJs)(buttonEl); } catch (_) { window.location.href = '/checkout'; }
                  } else {
                    window.location.href = '/checkout';
                  }
                });
                return;
              }
              if (checkoutJs) {
                e.preventDefault();
                this.setState({ checkoutWaiting: true });
                try { new Function('button', checkoutJs)(buttonEl); } catch (_) { window.location.href = '/checkout'; }
                setTimeout(() => this.setState({ checkoutWaiting: false }), 500);
              }
            }}
          >
            <span class="cartmax-checkout-label">{this.state.checkoutWaiting ? 'Preparing...' : this._text.checkout_button}</span>
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
    var self = this;

    // Total MRP = full retail: compare-at price where we have it, else the
    // line's own pre-discount price. Sum across lines.
    var totalMRP = 0;
    (cart.items || []).forEach(function (it) {
      var compareUnit = self._compareAtCache[String(it.variant_id)];
      var unit = (compareUnit && compareUnit > (it.original_price || 0)) ? compareUnit : (it.original_price || 0);
      totalMRP += unit * (it.quantity || 0);
    });

    // Coupon discount = the amount attributable to the APPLIED coupon codes
    // (automatic/sale discounts are folded into "Discount on MRP"). Match by the
    // real applied code titles rather than a `type` flag, which isn't reliable
    // across coupon kinds. For each code, prefer its line-level allocations
    // (order-level codes spread across items); fall back to the cart-level
    // allocation — never both, so it can't double-count.
    var couponDiscount = 0;
    this.getAppliedCodes().forEach(function (code) {
      couponDiscount += savingsForCode(cart, code);
    });
    var shippingNote = this._text.shipping_note || '';
    var noteOpen = this.state.shippingNoteOpen !== false;

    var totalAmount = cart.total_price || 0;
    // Everything between retail and what's paid, minus the coupon portion, is
    // the "discount on MRP" (sale + automatic/volume discounts).
    var discountOnMRP = Math.max(0, totalMRP - totalAmount - couponDiscount);

    return (
      <div class="cartmax-pb-backdrop" onClick={() => this.setState({ priceBreakupOpen: false })}>
        <div class="cartmax-price-breakup-panel" onClick={(e) => e.stopPropagation()}>
          <div class="cartmax-price-breakup-header">
            <span>{this._t('price_breakup_title', 'Price Break Up')}</span>
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
              <span class="cartmax-pb-label">{this._t('pb_total_mrp', 'Total MRP')}</span>
              <span class="cartmax-pb-amount">{formatMoney(totalMRP, curr)}</span>
            </div>
            {discountOnMRP > 0 ? (
              <div class="cartmax-pb-row">
                <span class="cartmax-pb-label">{this._t('pb_discount_mrp', 'Discount on MRP')}</span>
                <span class="cartmax-pb-amount cartmax-pb-discount">{'-'}{formatMoney(discountOnMRP, curr)}</span>
              </div>
            ) : null}
            <div class="cartmax-pb-row">
              <span class="cartmax-pb-label">{this._t('pb_coupon_discount', 'Coupon Discount')}</span>
              <span class="cartmax-pb-amount cartmax-pb-discount">{'-'}{formatMoney(couponDiscount, curr)}</span>
            </div>
            <div class="cartmax-pb-row">
              <span class="cartmax-pb-label">
                {this._t('pb_shipping', 'Shipping Fee')}
                {shippingNote
                  ? <button
                      class="cartmax-pb-info"
                      aria-label="Shipping details"
                      aria-expanded={noteOpen ? 'true' : 'false'}
                      onClick={() => this.setState({ shippingNoteOpen: !noteOpen })}
                    ><IconInfo /></button>
                  : null
                }
              </span>
              <span class="cartmax-pb-amount cartmax-pb-shipping">{this._t('pb_shipping_value', 'Calculated at checkout')}</span>
            </div>
            {shippingNote && noteOpen
              ? <div class="cartmax-pb-shipping-note">{shippingNote}</div>
              : null
            }
          </div>
          <div class="cartmax-price-breakup-total">
            <span>{this._t('pb_total', 'Total Amount')}</span>
            <span>{formatMoney(totalAmount, curr)}</span>
          </div>
        </div>
      </div>
    );
  }

    // ── Main render ───────────────────────────────────────────

  render(props, { visible, open, cart, loading, styled }) {
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

    // Base the empty/has-items gates on the *display* list (cart items + any
    // tombstones mid-collapse) and never show the empty state while an edit is
    // still pending — so the body can't flash empty during a reconcile.
    var displayItems = this._displayItems();
    var hasItems = !loading && displayItems.length > 0;
    var isEmpty = !loading && displayItems.length === 0 && !this._hasPendingEdits();
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
    // Heading style (titles, buttons, coupon codes): each class only when set,
    // so the default per-element styles stay untouched.
    var typo = this._typography;
    if (typo.heading_font) overlayClass += ' cartmax-heading-font';
    if (typo.heading_case === 'uppercase') overlayClass += ' cartmax-heading-upper';
    if (typo.heading_letter_spacing > 0) overlayClass += ' cartmax-heading-spaced';
    if (this._layout.header_align === 'center') overlayClass += ' cartmax-header-center';
    if (this._addBtnColored) overlayClass += ' cartmax-add-btn-colored';

    var sec = this._sections;
    var countStyle = this._layout.header_count_style;

    // Body sections in the merchant's order (Customize Cart → Sections).
    var bodySections = {
      progress_bar: () => (hasItems && sec.show_progress_bar ? this.renderProgressBar() : null),
      claim_gifts: () => (hasItems && sec.show_claim_gifts ? this.renderClaimGifts() : null),
      offer_cards: () => (hasItems && sec.show_offer_cards ? this.renderOfferDisplays() : null),
      line_items: () => (loading
        ? this.renderLoading()
        : isEmpty
          ? this.renderEmpty()
          : hasItems
            ? displayItems.map((item) => this.renderLineItem(item))
            : null),
      coupons: () => (hasItems && sec.show_coupons ? this.renderCoupons() : null),
      upsells: () => (hasItems && sec.show_upsells ? this.renderUpsells() : null),
    };

    return (
      <div class="cartmax-wrapper">
        {liveRegion}
        <div
          class={overlayClass}
          onClick={this.handleOverlayClick}
          style={styled ? undefined : { visibility: 'hidden' }}
        >
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
                {count > 0 && countStyle !== 'hidden'
                  ? <span class={'cartmax-header-count' + (countStyle === 'brackets' ? ' cartmax-header-count--brackets' : '')}>
                      {countStyle === 'brackets' ? '(' + count + ')' : count}
                    </span>
                  : null
                }
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
              {sec.order.map((key) => <Fragment key={key}>{bodySections[key]()}</Fragment>)}
            </div>

            {/* Ribbon */}
            {hasItems && sec.show_ribbon ? this.renderRibbon() : null}

            {/* Upsells pinned to bottom on empty cart */}
            {isEmpty && sec.show_upsells ? this.renderUpsells() : null}

            {/* Footer */}
            {hasItems ? this.renderFooter() : null}

            {/* Offers & Coupons panel — overlays the whole drawer (root-level so
                body scroll can't push it under the header) */}
            {sec.show_coupons ? this.renderCouponsPanel() : null}

            {/* Price Breakup Panel — slides up over drawer content */}
            {this.state.priceBreakupOpen ? this.renderPriceBreakup() : null}
          </div>
        </div>
      </div>
    );
  }
}
