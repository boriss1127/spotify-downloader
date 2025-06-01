// Track animation progress
const animationDuration = 8000; // 8 seconds

// Get or set animation start time
function getAnimationStartTime() {
    let startTime = localStorage.getItem('blobAnimationStartTime');
    if (!startTime) {
        startTime = Date.now();
        localStorage.setItem('blobAnimationStartTime', startTime);
    }
    return parseInt(startTime);
}

// Initialize blob
function initBlob() {
    const blob = document.querySelector('.glow');
    if (!blob) return;

    const animationStartTime = getAnimationStartTime();
    
    // Calculate how far into the animation we are
    const elapsed = (Date.now() - animationStartTime) % animationDuration;
    const progress = elapsed / animationDuration;

    // Apply the current animation state
    const scale = 0.1 + (progress < 0.5 ? progress * 3.8 : (1 - progress) * 3.8);
    const opacity = progress < 0.5 ? progress * 1.6 : (1 - progress) * 1.6;
    
    blob.style.transform = `translate(-50%, -50%) scale(${scale})`;
    blob.style.opacity = opacity;

    // Start the animation from this point
    blob.style.animation = 'none';
    blob.offsetHeight; // Trigger reflow
    blob.style.animation = `pulse ${animationDuration}ms ease-in-out infinite`;
    blob.style.animationDelay = `-${elapsed}ms`;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initBlob); 