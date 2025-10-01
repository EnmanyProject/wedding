// Direct Mobile Card Swiper Test Script
// Run this script in browser console while on localhost:3000

(function() {
    'use strict';

    console.log('🚀 Starting Mobile Card Swiper Test Suite');
    console.log('='.repeat(50));

    const testResults = {
        timestamp: new Date().toISOString(),
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio,
            userAgent: navigator.userAgent,
            touchSupport: 'ontouchstart' in window
        },
        tests: {}
    };

    // Utility functions
    function log(message, type = 'info') {
        const prefix = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        }[type];
        console.log(`${prefix} ${message}`);
    }

    function findCardContainer() {
        const selectors = [
            '[data-testid="card-container"]',
            '.card-swiper',
            '.cards-container',
            '.swiper-container',
            '[class*="swiper"]',
            '[class*="card"][class*="container"]'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) return element;
        }

        // Fallback: find any element with cards
        const cards = document.querySelectorAll('.card, [data-testid="card"], [class*="card"]');
        if (cards.length > 0) {
            return cards[0].parentElement;
        }

        return null;
    }

    function findCards() {
        const selectors = [
            '.card',
            '[data-testid="card"]',
            '[class*="card"]:not([class*="container"])',
            '.swiper-slide'
        ];

        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) return Array.from(elements);
        }

        return [];
    }

    // Test 1: Container and Cards Detection
    function testCardDetection() {
        log('Testing card detection...', 'info');

        const container = findCardContainer();
        const cards = findCards();

        const result = {
            containerFound: !!container,
            cardCount: cards.length,
            containerInfo: container ? {
                tagName: container.tagName,
                className: container.className,
                width: container.offsetWidth,
                height: container.offsetHeight
            } : null,
            cardInfo: cards.map((card, index) => ({
                index,
                tagName: card.tagName,
                className: card.className,
                width: card.offsetWidth,
                height: card.offsetHeight
            }))
        };

        testResults.tests.cardDetection = result;

        if (result.containerFound) {
            log(`Found container: ${result.containerInfo.tagName}.${result.containerInfo.className}`, 'success');
        } else {
            log('No card container found', 'error');
        }

        log(`Found ${result.cardCount} cards`, result.cardCount > 0 ? 'success' : 'warning');

        return result;
    }

    // Test 2: Centering Accuracy
    function testCenteringAccuracy() {
        log('Testing card centering accuracy...', 'info');

        const container = findCardContainer();
        const cards = findCards();

        if (!container || cards.length === 0) {
            log('Cannot test centering - no container or cards found', 'error');
            return { error: 'No container or cards found' };
        }

        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.left + containerRect.width / 2;

        const centeringResults = cards.map((card, index) => {
            const cardRect = card.getBoundingClientRect();
            const cardCenter = cardRect.left + cardRect.width / 2;
            const distanceFromCenter = Math.abs(cardCenter - containerCenter);

            return {
                cardIndex: index,
                cardCenter: cardCenter,
                containerCenter: containerCenter,
                distanceFromCenter: distanceFromCenter,
                isAccurate: distanceFromCenter < 10, // 10px tolerance
                cardRect: {
                    left: cardRect.left,
                    width: cardRect.width,
                    right: cardRect.right
                }
            };
        });

        const accurateCards = centeringResults.filter(r => r.isAccurate).length;
        const averageDeviation = centeringResults.reduce((sum, r) => sum + r.distanceFromCenter, 0) / centeringResults.length;

        const result = {
            containerWidth: containerRect.width,
            containerCenter: containerCenter,
            cardCount: cards.length,
            accurateCards: accurateCards,
            accuracyPercentage: (accurateCards / cards.length) * 100,
            averageDeviation: averageDeviation,
            maxDeviation: Math.max(...centeringResults.map(r => r.distanceFromCenter)),
            centeringResults: centeringResults
        };

        testResults.tests.centeringAccuracy = result;

        log(`Centering accuracy: ${accurateCards}/${cards.length} cards (${result.accuracyPercentage.toFixed(1)}%)`,
            result.accuracyPercentage > 80 ? 'success' : 'warning');
        log(`Average deviation: ${averageDeviation.toFixed(2)}px`, averageDeviation < 5 ? 'success' : 'warning');
        log(`Maximum deviation: ${result.maxDeviation.toFixed(2)}px`, result.maxDeviation < 15 ? 'success' : 'warning');

        return result;
    }

    // Test 3: CSS Transitions and Animations
    function testTransitionSmoothness() {
        log('Testing transition smoothness...', 'info');

        const cards = findCards();

        if (cards.length === 0) {
            log('Cannot test transitions - no cards found', 'error');
            return { error: 'No cards found' };
        }

        const transitionResults = cards.map((card, index) => {
            const computedStyle = window.getComputedStyle(card);

            return {
                cardIndex: index,
                transition: computedStyle.transition,
                transitionDuration: computedStyle.transitionDuration,
                transitionTimingFunction: computedStyle.transitionTimingFunction,
                transitionProperty: computedStyle.transitionProperty,
                transform: computedStyle.transform,
                willChange: computedStyle.willChange,
                hasTransition: computedStyle.transition !== 'none' && computedStyle.transition !== '',
                hasDuration: computedStyle.transitionDuration !== '0s',
                hasTransform: computedStyle.transform !== 'none'
            };
        });

        const cardsWithTransitions = transitionResults.filter(r => r.hasTransition).length;
        const cardsWithDuration = transitionResults.filter(r => r.hasDuration).length;
        const cardsWithTransform = transitionResults.filter(r => r.hasTransform).length;

        const result = {
            cardCount: cards.length,
            cardsWithTransitions: cardsWithTransitions,
            cardsWithDuration: cardsWithDuration,
            cardsWithTransform: cardsWithTransform,
            transitionCoverage: (cardsWithTransitions / cards.length) * 100,
            transitionResults: transitionResults
        };

        testResults.tests.transitionSmoothness = result;

        log(`Transition coverage: ${cardsWithTransitions}/${cards.length} cards (${result.transitionCoverage.toFixed(1)}%)`,
            result.transitionCoverage > 50 ? 'success' : 'warning');
        log(`Cards with duration: ${cardsWithDuration}/${cards.length}`,
            cardsWithDuration > 0 ? 'success' : 'warning');
        log(`Cards with transforms: ${cardsWithTransform}/${cards.length}`,
            cardsWithTransform > 0 ? 'success' : 'info');

        return result;
    }

    // Test 4: Touch Event Simulation
    function testTouchEventSupport() {
        log('Testing touch event support...', 'info');

        const container = findCardContainer();

        if (!container) {
            log('Cannot test touch events - no container found', 'error');
            return { error: 'No container found' };
        }

        const touchSupport = {
            ontouchstart: 'ontouchstart' in window,
            ontouchmove: 'ontouchmove' in window,
            ontouchend: 'ontouchend' in window,
            touchEventConstructor: typeof TouchEvent !== 'undefined',
            touchConstructor: typeof Touch !== 'undefined'
        };

        const result = {
            containerTagName: container.tagName,
            containerClass: container.className,
            touchSupport: touchSupport,
            hasBasicTouchSupport: touchSupport.ontouchstart && touchSupport.touchEventConstructor,
            canSimulateTouch: touchSupport.touchEventConstructor && touchSupport.touchConstructor
        };

        testResults.tests.touchEventSupport = result;

        log(`Basic touch support: ${result.hasBasicTouchSupport ? 'Yes' : 'No'}`,
            result.hasBasicTouchSupport ? 'success' : 'warning');
        log(`Can simulate touch: ${result.canSimulateTouch ? 'Yes' : 'No'}`,
            result.canSimulateTouch ? 'success' : 'warning');

        return result;
    }

    // Test 5: Swipe Gesture Simulation
    function testSwipeGestures() {
        log('Testing swipe gestures...', 'info');

        const container = findCardContainer();

        if (!container) {
            log('Cannot test swipe gestures - no container found', 'error');
            return { error: 'No container found' };
        }

        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const swipeTests = [];

        // Test different swipe speeds and distances
        const swipeConfigs = [
            { name: 'slow', startX: centerX + 100, endX: centerX - 100, duration: 800 },
            { name: 'medium', startX: centerX + 100, endX: centerX - 100, duration: 400 },
            { name: 'fast', startX: centerX + 100, endX: centerX - 100, duration: 150 }
        ];

        swipeConfigs.forEach(config => {
            try {
                const touchStart = new TouchEvent('touchstart', {
                    bubbles: true,
                    cancelable: true,
                    touches: [new Touch({
                        identifier: 1,
                        target: container,
                        clientX: config.startX,
                        clientY: centerY
                    })]
                });

                const touchMove = new TouchEvent('touchmove', {
                    bubbles: true,
                    cancelable: true,
                    touches: [new Touch({
                        identifier: 1,
                        target: container,
                        clientX: config.endX,
                        clientY: centerY
                    })]
                });

                const touchEnd = new TouchEvent('touchend', {
                    bubbles: true,
                    cancelable: true,
                    changedTouches: [new Touch({
                        identifier: 1,
                        target: container,
                        clientX: config.endX,
                        clientY: centerY
                    })]
                });

                container.dispatchEvent(touchStart);
                setTimeout(() => container.dispatchEvent(touchMove), config.duration * 0.1);
                setTimeout(() => container.dispatchEvent(touchEnd), config.duration);

                swipeTests.push({
                    name: config.name,
                    duration: config.duration,
                    distance: Math.abs(config.endX - config.startX),
                    executed: true,
                    startX: config.startX,
                    endX: config.endX
                });

                log(`${config.name} swipe simulated (${config.duration}ms, ${Math.abs(config.endX - config.startX)}px)`, 'success');

            } catch (error) {
                swipeTests.push({
                    name: config.name,
                    executed: false,
                    error: error.message
                });
                log(`${config.name} swipe failed: ${error.message}`, 'error');
            }
        });

        const result = {
            containerRect: { width: rect.width, height: rect.height },
            centerPoint: { x: centerX, y: centerY },
            swipeTests: swipeTests,
            successfulSwipes: swipeTests.filter(t => t.executed).length
        };

        testResults.tests.swipeGestures = result;

        return result;
    }

    // Test 6: Performance Metrics
    function testPerformanceMetrics() {
        log('Collecting performance metrics...', 'info');

        const performance = window.performance;

        const result = {
            navigation: performance.getEntriesByType('navigation')[0],
            paint: performance.getEntriesByType('paint'),
            memory: performance.memory ? {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            } : null,
            timing: {
                domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
                pageLoad: performance.timing.loadEventEnd - performance.timing.navigationStart,
                domInteractive: performance.timing.domInteractive - performance.timing.navigationStart
            }
        };

        testResults.tests.performanceMetrics = result;

        log(`DOM Content Loaded: ${result.timing.domContentLoaded}ms`, 'info');
        log(`Page Load Complete: ${result.timing.pageLoad}ms`, 'info');

        return result;
    }

    // Main test runner
    function runAllTests() {
        log('🚀 Running comprehensive mobile card swiper test suite', 'info');
        console.log('');

        try {
            testCardDetection();
            console.log('');

            testCenteringAccuracy();
            console.log('');

            testTransitionSmoothness();
            console.log('');

            testTouchEventSupport();
            console.log('');

            testSwipeGestures();
            console.log('');

            testPerformanceMetrics();
            console.log('');

            log('✅ All tests completed successfully', 'success');
            console.log('='.repeat(50));
            console.log('📊 Final Test Results:');
            console.log(JSON.stringify(testResults, null, 2));

            // Summary report
            generateSummaryReport();

        } catch (error) {
            log(`❌ Test suite failed: ${error.message}`, 'error');
            console.error(error);
        }
    }

    function generateSummaryReport() {
        console.log('');
        console.log('📋 SUMMARY REPORT');
        console.log('='.repeat(50));

        const tests = testResults.tests;

        // Card Detection Summary
        if (tests.cardDetection) {
            console.log(`🎯 Card Detection: ${tests.cardDetection.containerFound ? '✅' : '❌'} Container, ${tests.cardDetection.cardCount} Cards`);
        }

        // Centering Accuracy Summary
        if (tests.centeringAccuracy && !tests.centeringAccuracy.error) {
            const accuracy = tests.centeringAccuracy.accuracyPercentage.toFixed(1);
            const avgDev = tests.centeringAccuracy.averageDeviation.toFixed(2);
            console.log(`📐 Centering Accuracy: ${accuracy}% accurate, ${avgDev}px avg deviation`);
        }

        // Transition Summary
        if (tests.transitionSmoothness && !tests.transitionSmoothness.error) {
            const coverage = tests.transitionSmoothness.transitionCoverage.toFixed(1);
            console.log(`🎬 Transitions: ${coverage}% coverage, ${tests.transitionSmoothness.cardsWithTransitions}/${tests.transitionSmoothness.cardCount} cards`);
        }

        // Touch Support Summary
        if (tests.touchEventSupport) {
            console.log(`👆 Touch Support: ${tests.touchEventSupport.hasBasicTouchSupport ? '✅' : '❌'} Basic, ${tests.touchEventSupport.canSimulateTouch ? '✅' : '❌'} Simulation`);
        }

        // Swipe Gestures Summary
        if (tests.swipeGestures && !tests.swipeGestures.error) {
            console.log(`👋 Swipe Gestures: ${tests.swipeGestures.successfulSwipes}/${tests.swipeGestures.swipeTests.length} successful simulations`);
        }

        // Performance Summary
        if (tests.performanceMetrics) {
            const loadTime = tests.performanceMetrics.timing.pageLoad;
            console.log(`⚡ Performance: ${loadTime}ms page load`);
        }

        console.log('');
        console.log('🎯 RECOMMENDATIONS:');

        // Generate recommendations based on test results
        if (tests.centeringAccuracy && tests.centeringAccuracy.accuracyPercentage < 80) {
            console.log('⚠️  Improve card centering accuracy - consider snap-to-center mechanics');
        }

        if (tests.transitionSmoothness && tests.transitionSmoothness.transitionCoverage < 50) {
            console.log('⚠️  Add CSS transitions for smoother card animations');
        }

        if (!tests.touchEventSupport?.hasBasicTouchSupport) {
            console.log('⚠️  Limited touch support detected - test on actual mobile device');
        }

        console.log('✅ Test suite complete - review results above');
    }

    // Export functions for manual testing
    window.cardSwiperTest = {
        runAllTests,
        testCardDetection,
        testCenteringAccuracy,
        testTransitionSmoothness,
        testTouchEventSupport,
        testSwipeGestures,
        testPerformanceMetrics,
        getResults: () => testResults
    };

    // Auto-run tests
    log('Mobile Card Swiper Test Suite Loaded', 'success');
    log('Run cardSwiperTest.runAllTests() to start testing', 'info');
    log('Or run individual tests: cardSwiperTest.testCenteringAccuracy()', 'info');

    // Auto-run after 1 second to allow page to settle
    setTimeout(runAllTests, 1000);

})();