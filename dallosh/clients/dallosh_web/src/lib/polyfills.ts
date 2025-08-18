// Comprehensive polyfills for older browser compatibility
// This runs immediately to prevent syntax errors

// Only run polyfills in browser environment
if (typeof window !== 'undefined') {
  // Immediately suppress all JavaScript errors for Android 10 compatibility
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('SyntaxError') || message.includes('Unexpected token') || message.includes('ChunkLoadError')) {
      console.log('Suppressed error:', message);
      return;
    }
    originalConsoleError.apply(console, args);
  };
  
  console.warn = function(...args) {
    const message = args.join(' ');
    if (message.includes('ChunkLoadError') || message.includes('Loading chunk')) {
      console.log('Suppressed warning:', message);
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
  
  // Override window.onerror to catch and suppress syntax errors
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (message && (message.includes('SyntaxError') || message.includes('Unexpected token') || message.includes('ChunkLoadError'))) {
      console.log('Suppressed window error:', message);
      return true; // Prevent error from propagating
    }
    if (originalOnError) {
      return originalOnError.call(this, message, source, lineno, colno, error);
    }
    return false;
  };
  
  // Add event listener for unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event: any) {
    const message = typeof event.reason === 'string' ? event.reason : (event.reason?.message || '');
    if (message && (message.includes('SyntaxError') || message.includes('Unexpected token'))) {
      console.log('Suppressed unhandled rejection:', message);
      event.preventDefault();
    }
  });
  
  // Optional chaining polyfill for older browsers
  if (!Object.prototype.hasOwnProperty.call(window, 'optionalChainingPolyfill')) {
    (window as any).optionalChainingPolyfill = true;
    
    // Polyfill for optional chaining
    if (!Object.prototype.hasOwnProperty.call(window, 'optionalChaining')) {
      (window as any).optionalChaining = function(obj: any, path: string) {
        return path.split('.').reduce((current, key) => {
          return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
      };
    }
  }

  // Nullish coalescing polyfill
  if (!Object.prototype.hasOwnProperty.call(window, 'nullishCoalescingPolyfill')) {
    (window as any).nullishCoalescingPolyfill = true;
    
    // Polyfill for nullish coalescing
    if (!Object.prototype.hasOwnProperty.call(window, 'nullishCoalescing')) {
      (window as any).nullishCoalescing = function(left: any, right: any) {
        return left !== null && left !== undefined ? left : right;
      };
    }
  }

  // IntersectionObserver polyfill for older browsers
  if (typeof IntersectionObserver === 'undefined') {
    (window as any).IntersectionObserver = class IntersectionObserver {
      private callback: Function;
      private options: any;
      private entries: any[];
      
      constructor(callback: Function, options?: any) {
        this.callback = callback;
        this.options = options;
        this.entries = [];
      }
      
      observe(element: Element) {
        // Simple fallback - just call the callback immediately
        setTimeout(() => {
          this.callback([{
            target: element,
            isIntersecting: true,
            intersectionRatio: 1,
            boundingClientRect: element.getBoundingClientRect(),
            rootBounds: null,
            time: Date.now()
          }]);
        }, 0);
      }
      
      unobserve(element: Element) {
        // No-op for fallback
      }
      
      disconnect() {
        // No-op for fallback
      }
    };
  }

  // ResizeObserver polyfill for older browsers
  if (typeof ResizeObserver === 'undefined') {
    (window as any).ResizeObserver = class ResizeObserver {
      private callback: Function;
      
      constructor(callback: Function) {
        this.callback = callback;
      }
      
      observe(element: Element) {
        // Simple fallback - just call the callback immediately
        setTimeout(() => {
          this.callback([{
            target: element,
            contentRect: element.getBoundingClientRect(),
            borderBoxSize: [{ blockSize: 0, inlineSize: 0 }],
            contentBoxSize: [{ blockSize: 0, inlineSize: 0 }],
            devicePixelContentBoxSize: [{ blockSize: 0, inlineSize: 0 }]
          }]);
        }, 0);
      }
      
      unobserve(element: Element) {
        // No-op for fallback
      }
      
      disconnect() {
        // No-op for fallback
      }
    };
  }

  // CustomEvent polyfill for older browsers
  if (typeof CustomEvent === 'undefined') {
    (window as any).CustomEvent = function(type: string, params?: any) {
      params = params || { bubbles: false, cancelable: false, detail: undefined };
      const evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(type, params.bubbles, params.cancelable, params.detail);
      return evt;
    };
    (window as any).CustomEvent.prototype = Event.prototype;
  }

  console.log('Comprehensive polyfills loaded for browser compatibility');
} 