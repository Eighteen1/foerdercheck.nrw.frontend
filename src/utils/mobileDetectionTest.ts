// Utility to test mobile detection logic
// This can be used in browser console for testing

export const testMobileDetection = () => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Common mobile phone user agent patterns
  const mobileRegex = /Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile.*Safari/i;
  const isMobile = mobileRegex.test(userAgent);
  const isSmallScreen = screenWidth < 768 || (screenWidth < 1024 && screenHeight < 1024);
  
  const isMobilePhone = isMobile && isSmallScreen && hasTouch;
  
  console.log('Mobile Detection Test Results:');
  console.log('User Agent:', userAgent);
  console.log('Screen Size:', `${screenWidth}x${screenHeight}`);
  console.log('Has Touch:', hasTouch);
  console.log('Is Mobile (User Agent):', isMobile);
  console.log('Is Small Screen:', isSmallScreen);
  console.log('Is Mobile Phone (Final Result):', isMobilePhone);
  
  return {
    userAgent,
    screenWidth,
    screenHeight,
    hasTouch,
    isMobile,
    isSmallScreen,
    isMobilePhone
  };
};

// Make it available globally for easy testing
if (typeof window !== 'undefined') {
  (window as any).testMobileDetection = testMobileDetection;
}
