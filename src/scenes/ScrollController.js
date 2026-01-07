import Lenis from '@studio-freight/lenis';

export class ScrollController {
  constructor() {
    this.lenis = null;
    this.scrollPosition = 0; // Current raw scroll Y position
    this.scrollProgress = 0; // Normalized scroll progress (0-1)
    this.totalScrollHeight = 0; // Total height of scrollable content

    this.onScrollCallbacks = [];
    this.isScrolling = false;
    this.scrollTimeout = null;
  }

  /**
   * Initializes the Lenis smooth scrolling instance and sets up event listeners.
   */
  init() {
    console.log('📜 Initializing ScrollController...');
    this.lenis = new Lenis({
      duration: 0.8, // Faster, more responsive (was 1.2)
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
      direction: 'vertical',
      gestureDirection: 'vertical',
      syncTouch: true,
      touchMultiplier: 2, // More responsive on touch devices
      wheelMultiplier: 1.5, // More responsive with mouse wheel
      autoResize: true,
    });

    this.lenis.on('scroll', this._onScroll.bind(this));

    // Initial calculation of total scroll height
    this._updateScrollHeight();

    // Recalculate on window resize (important for responsive layouts)
    window.addEventListener('resize', this._updateScrollHeight.bind(this));

    // Start the Lenis animation frame loop
    requestAnimationFrame(this._raf.bind(this));

    console.log('✅ ScrollController initialized.');
  }

  /**
   * Handles the 'scroll' event from Lenis.
   * @param {Object} event - Lenis scroll event object.
   * @private
   */
  _onScroll(event) {
    this.scrollPosition = event.scroll;
    // Calculate scroll progress (0 to 1) based on total scrollable height
    this.scrollProgress = this.totalScrollHeight > 0 ? (event.scroll / this.totalScrollHeight) : 0;

    // Set scrolling flag
    this.isScrolling = true;
    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false;
    }, 150); // Consider scroll stopped after 150ms of no scroll events

    // Trigger all registered callbacks
    this.onScrollCallbacks.forEach(callback => callback(this.scrollPosition, this.scrollProgress));
  }

  /**
   * Updates the total scrollable height of the document.
   * @private
   */
  _updateScrollHeight() {
    // We assume there's a #scroll-container holding the actual scrollable content
    const scrollContainer = document.getElementById('scroll-container');
    if (scrollContainer) {
      // Correctly determine scrollable height:
      // It's the total height of the content minus the viewport height
      this.totalScrollHeight = scrollContainer.scrollHeight - window.innerHeight;

      // Ensure totalScrollHeight is not negative (can happen if content is shorter than viewport)
      if (this.totalScrollHeight < 0) {
        this.totalScrollHeight = 0;
      }
      console.log(`   Total scrollable height updated to: ${this.totalScrollHeight.toFixed(0)}px`);
    } else {
      // Fallback to document body if #scroll-container not found
      this.totalScrollHeight = document.body.scrollHeight - window.innerHeight;
      if (this.totalScrollHeight < 0) {
        this.totalScrollHeight = 0;
      }
      console.warn('   #scroll-container not found. Falling back to document.body for scroll height.');
    }
  }

  /**
   * Request animation frame loop for Lenis.
   * @param {DOMHighResTimeStamp} time - Current time.
   * @private
   */
  _raf(time) {
    if (this.lenis) {
      this.lenis.raf(time);
    }
    requestAnimationFrame(this._raf.bind(this));
  }

  /**
   * Registers a callback function to be called on every scroll update.
   * @param {Function} callback - The function to call, receiving (scrollPosition, scrollProgress).
   */
  onScroll(callback) {
    this.onScrollCallbacks.push(callback);
  }

  /**
   * Disposes the ScrollController and cleans up event listeners.
   */
  dispose() {
    if (this.lenis) {
      this.lenis.destroy();
      this.lenis = null;
    }
    window.removeEventListener('resize', this._updateScrollHeight.bind(this));
    this.onScrollCallbacks = [];
    console.log('🧹 ScrollController disposed.');
  }
}
