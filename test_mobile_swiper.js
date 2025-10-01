// Mobile Card Swiper Test Script
// This script will test the mobile card swiper functionality

const SITE_URL = 'http://localhost:3000';

class MobileCardSwiperTester {
    constructor() {
        this.testResults = {
            centeringAccuracy: [],
            transitionSmoothness: [],
            consoleErrors: [],
            swipeResponsiveness: [],
            performanceMetrics: []
        };
    }

    // Simulate different swipe speeds
    async testSwipeGestures() {
        const swipeSpeeds = [
            { name: 'slow', duration: 800, distance: 200 },
            { name: 'medium', duration: 400, distance: 200 },
            { name: 'fast', duration: 150, distance: 200 }
        ];

        for (const speed of swipeSpeeds) {
            console.log(`Testing ${speed.name} swipe...`);
            await this.performSwipeTest(speed);
        }
    }

    // Test card centering after swipes
    async testCardCentering() {
        console.log('Testing card centering accuracy...');

        // Check if cards snap to center position
        const centeringTest = `
            // Get card container and cards
            const container = document.querySelector('[data-testid="card-container"]') ||
                            document.querySelector('.card-swiper') ||
                            document.querySelector('.cards-container');

            if (!container) {
                return { error: 'Card container not found' };
            }

            const cards = container.querySelectorAll('.card, [data-testid="card"]');
            const containerRect = container.getBoundingClientRect();
            const containerCenter = containerRect.left + containerRect.width / 2;

            let centeringAccuracy = [];

            cards.forEach((card, index) => {
                const cardRect = card.getBoundingClientRect();
                const cardCenter = cardRect.left + cardRect.width / 2;
                const distanceFromCenter = Math.abs(cardCenter - containerCenter);

                centeringAccuracy.push({
                    cardIndex: index,
                    distanceFromCenter: distanceFromCenter,
                    isAccurate: distanceFromCenter < 10 // Within 10px tolerance
                });
            });

            return {
                containerWidth: containerRect.width,
                centerPosition: containerCenter,
                cardAccuracy: centeringAccuracy
            };
        `;

        return centeringTest;
    }

    // Monitor console logs and errors
    getConsoleMonitor() {
        return `
            // Console monitoring setup
            const originalLog = console.log;
            const originalError = console.error;
            const originalWarn = console.warn;

            window.testConsoleCapture = {
                logs: [],
                errors: [],
                warnings: []
            };

            console.log = function(...args) {
                window.testConsoleCapture.logs.push({
                    timestamp: Date.now(),
                    message: args.join(' ')
                });
                originalLog.apply(console, args);
            };

            console.error = function(...args) {
                window.testConsoleCapture.errors.push({
                    timestamp: Date.now(),
                    message: args.join(' ')
                });
                originalError.apply(console, args);
            };

            console.warn = function(...args) {
                window.testConsoleCapture.warnings.push({
                    timestamp: Date.now(),
                    message: args.join(' ')
                });
                originalWarn.apply(console, args);
            };
        `;
    }

    // Test transition smoothness
    getTransitionTest() {
        return `
            // Transition smoothness test
            function testTransitionSmoothness() {
                const cards = document.querySelectorAll('.card, [data-testid="card"]');
                let smoothnessResults = [];

                cards.forEach((card, index) => {
                    const computedStyle = window.getComputedStyle(card);
                    const transition = computedStyle.transition;
                    const transform = computedStyle.transform;

                    smoothnessResults.push({
                        cardIndex: index,
                        hasTransition: transition !== 'none' && transition !== '',
                        transition: transition,
                        transform: transform,
                        transitionDuration: computedStyle.transitionDuration,
                        transitionTimingFunction: computedStyle.transitionTimingFunction
                    });
                });

                return smoothnessResults;
            }

            testTransitionSmoothness();
        `;
    }

    // Generate comprehensive test report
    generateTestReport() {
        return `
            // Comprehensive test report generation
            function generateReport() {
                const report = {
                    timestamp: new Date().toISOString(),
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight,
                        devicePixelRatio: window.devicePixelRatio
                    },
                    userAgent: navigator.userAgent,
                    touchSupport: 'ontouchstart' in window,
                    tests: {}
                };

                // Get console capture results
                if (window.testConsoleCapture) {
                    report.console = window.testConsoleCapture;
                }

                // Performance metrics
                if (window.performance) {
                    report.performance = {
                        navigation: performance.getEntriesByType('navigation')[0],
                        paintMetrics: performance.getEntriesByType('paint')
                    };
                }

                return report;
            }

            generateReport();
        `;
    }
}

// Export for use in testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileCardSwiperTester;
}