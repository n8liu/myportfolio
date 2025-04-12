// Client-side JavaScript for portfolio
document.addEventListener('DOMContentLoaded', function() {
    // Ensure containers exist in static deployment
    
    // Show elements as they scroll into view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1
    });
    
    // Observe all sections that should animate on scroll
    document.querySelectorAll('.about-container, .tech-stack-container, .myhobbies-container, .footer').forEach(element => {
        observer.observe(element);
    });
});
