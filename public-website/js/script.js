// DOM Elements
const navbar = document.getElementById('navbar');
const navMenu = document.getElementById('nav-menu');
const hamburger = document.getElementById('hamburger');
const navLinks = document.querySelectorAll('.nav-link');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const contactForm = document.getElementById('contact-form');

// Navigation functionality
function initNavigation() {
    // Mobile menu toggle
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
    });

    // Close mobile menu when clicking on a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
        });
    });

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Active link highlighting
    window.addEventListener('scroll', () => {
        let current = '';
        const sections = document.querySelectorAll('section[id]');
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.scrollY >= (sectionTop - 200)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

// Modal functionality
function initModals() {
    // Open login modal - DISABLED: Using dedicated pages instead
    // window.openLoginModal = () => {
    //     loginModal.style.display = 'block';
    //     document.body.style.overflow = 'hidden';
    // };

    // Open register modal - DISABLED: Using dedicated pages instead
    // window.openRegisterModal = () => {
    //     registerModal.style.display = 'block';
    //     document.body.style.overflow = 'hidden';
    // };

    // Close modal
    window.closeModal = (modalId) => {
        const modal = document.getElementById(modalId);
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };

    // Switch between login and register modals
    window.switchToRegister = () => {
        loginModal.style.display = 'none';
        registerModal.style.display = 'block';
    };

    window.switchToLogin = () => {
        registerModal.style.display = 'none';
        loginModal.style.display = 'block';
    };

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === loginModal) {
            closeModal('loginModal');
        }
        if (event.target === registerModal) {
            closeModal('registerModal');
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (loginModal.style.display === 'block') {
                closeModal('loginModal');
            }
            if (registerModal.style.display === 'block') {
                closeModal('registerModal');
            }
        }
    });
}

// Form handling
function initForms() {
    // Login form submission - Now handled by React component
    if (false && loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(loginForm);
            const loginData = {
                email: formData.get('email'),
                password: formData.get('password')
            };

            try {
                showLoading(loginForm);
                
                // Make API call to your existing login endpoint
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(loginData)
                });

                const result = await response.json();

                if (response.ok) {
                    // Store authentication data
                    localStorage.setItem('token', result.token);
                    localStorage.setItem('user', JSON.stringify(result.user));
                    localStorage.setItem('userRole', result.user.role);
                    localStorage.setItem('userId', result.user.id);

                    showSuccess('Login successful! Redirecting...');
                    
                    // Redirect based on user role
                    setTimeout(() => {
                        switch (result.user.role) {
                            case 'admin':
                                window.location.href = '/admin/dashboard';
                                break;
                            case 'therapist':
                                window.location.href = '/therapist/dashboard';
                                break;
                            case 'patient':
                                window.location.href = '/patient/dashboard';
                                break;
                            default:
                                window.location.href = '/';
                        }
                    }, 1500);
                } else {
                    showError(result.message || 'Login failed. Please check your credentials.');
                }
            } catch (error) {
                console.error('Login error:', error);
                showError('Network error. Please check your connection and try again.');
            } finally {
                hideLoading(loginForm);
            }
        });
    }

    // Register form submission
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(registerForm);
            const registerData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                dateOfBirth: formData.get('dateOfBirth'),
                password: formData.get('password'),
                confirmPassword: formData.get('confirmPassword'),
                role: 'patient' // Default role for public registration
            };

            // Validate password confirmation
            if (registerData.password !== registerData.confirmPassword) {
                showError('Passwords do not match.');
                return;
            }

            try {
                showLoading(registerForm);
                
                // Make API call to your existing register endpoint
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(registerData)
                });

                const result = await response.json();

                if (response.ok) {
                    showSuccess('Registration successful! Please log in.');
                    setTimeout(() => {
                        closeModal('registerModal');
                        openLoginModal();
                    }, 1500);
                } else {
                    showError(result.message || 'Registration failed. Please try again.');
                }
            } catch (error) {
                console.error('Registration error:', error);
                showError('Network error. Please check your connection and try again.');
            } finally {
                hideLoading(registerForm);
            }
        });
    }

    // Contact form submission
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(contactForm);
            const contactData = {
                name: formData.get('name'),
                email: formData.get('email'),
                subject: formData.get('subject'),
                message: formData.get('message')
            };

            try {
                showLoading(contactForm);
                
                // You can implement a contact endpoint or use a service like EmailJS
                // For now, we'll simulate a successful submission
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                showSuccess('Thank you for your message! We\'ll get back to you soon.');
                contactForm.reset();
            } catch (error) {
                console.error('Contact form error:', error);
                showError('Failed to send message. Please try again.');
            } finally {
                hideLoading(contactForm);
            }
        });
    }
}

// Utility functions
function showLoading(form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    submitBtn.disabled = true;
    form.classList.add('loading');
}

function hideLoading(form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // Restore original button text based on form type
    if (form.id === 'loginForm') {
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    } else if (form.id === 'registerForm') {
        submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    } else if (form.id === 'contact-form') {
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
    }
    
    submitBtn.disabled = false;
    form.classList.remove('loading');
}

function showSuccess(message) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.success, .error');
    existingMessages.forEach(msg => msg.remove());
    
    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    
    // Insert at the top of the form
    const form = document.querySelector('.auth-form, .contact-form');
    form.insertBefore(successDiv, form.firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        successDiv.remove();
    }, 5000);
}

function showError(message) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.success, .error');
    existingMessages.forEach(msg => msg.remove());
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    // Insert at the top of the form
    const form = document.querySelector('.auth-form, .contact-form');
    form.insertBefore(errorDiv, form.firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Smooth scrolling
function initSmoothScrolling() {
    window.scrollToSection = (sectionId) => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    };

    // Handle anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            if (targetId) {
                scrollToSection(targetId);
            }
        });
    });
}

// Animation on scroll
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);

    // Observe elements for animation
    document.querySelectorAll('.feature-card, .service-card, .contact-item').forEach(el => {
        observer.observe(el);
    });
}

// Form validation
function initFormValidation() {
    // Email validation
    const emailInputs = document.querySelectorAll('input[type="email"]');
    emailInputs.forEach(input => {
        input.addEventListener('blur', () => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (input.value && !emailRegex.test(input.value)) {
                input.style.borderColor = '#ef4444';
                showFieldError(input, 'Please enter a valid email address');
            } else {
                input.style.borderColor = '#e5e7eb';
                hideFieldError(input);
            }
        });
    });

    // Password validation
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(input => {
        input.addEventListener('input', () => {
            const password = input.value;
            if (password.length > 0 && password.length < 6) {
                input.style.borderColor = '#ef4444';
                showFieldError(input, 'Password must be at least 6 characters');
            } else {
                input.style.borderColor = '#e5e7eb';
                hideFieldError(input);
            }
        });
    });

    // Phone validation
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        input.addEventListener('blur', () => {
            const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
            if (input.value && !phoneRegex.test(input.value.replace(/\s/g, ''))) {
                input.style.borderColor = '#ef4444';
                showFieldError(input, 'Please enter a valid phone number');
            } else {
                input.style.borderColor = '#e5e7eb';
                hideFieldError(input);
            }
        });
    });
}

function showFieldError(input, message) {
    hideFieldError(input); // Remove existing error
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.style.color = '#ef4444';
    errorDiv.style.fontSize = '0.8rem';
    errorDiv.style.marginTop = '0.25rem';
    errorDiv.textContent = message;
    
    input.parentNode.appendChild(errorDiv);
}

function hideFieldError(input) {
    const existingError = input.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
}

// Demo account functionality
function initDemoAccounts() {
    // Add click handlers for demo accounts if they exist
    const demoAccounts = document.querySelectorAll('[data-demo-account]');
    demoAccounts.forEach(account => {
        account.addEventListener('click', (e) => {
            e.preventDefault();
            const email = account.dataset.email;
            const password = account.dataset.password;
            
            // Fill login form with demo credentials
            const emailInput = document.getElementById('loginEmail');
            const passwordInput = document.getElementById('loginPassword');
            
            if (emailInput && passwordInput) {
                emailInput.value = email;
                passwordInput.value = password;
                openLoginModal();
            }
        });
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initModals();
    initForms();
    initSmoothScrolling();
    initScrollAnimations();
    initFormValidation();
    initDemoAccounts();
    
    // Add loading animation to page
    document.body.classList.add('fade-in');
    
    console.log('TheraPease public website initialized successfully!');
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden
        console.log('Page hidden');
    } else {
        // Page is visible
        console.log('Page visible');
    }
});

// Service Worker registration (for future PWA features)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Export functions for global access
window.TheraPease = {
    openLoginModal,
    openRegisterModal,
    closeModal,
    switchToLogin,
    switchToRegister,
    scrollToSection,
    showSuccess,
    showError
};
