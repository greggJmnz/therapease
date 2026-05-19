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
const portalsDropdown = document.getElementById('portalsDropdown');
const portalsMenu = document.getElementById('portalsMenu');
const portalItems = document.querySelectorAll('.dropdown-item[data-portal]');

// Navigation functionality
function initNavigation() {
    // Check if elements exist before using them
    if (!hamburger || !navMenu) {
        console.warn('Navigation elements not found - hamburger menu may not work');
        return;
    }
    
    // Mobile menu toggle
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
    });

    // Close mobile menu when clicking on a link (but not portal dropdown)
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Don't close mobile menu if it's the portal dropdown button
            if (link === portalsDropdown) {
                console.log('Portal dropdown clicked - keeping menu open');
                e.stopPropagation();
                return; // Don't close the menu for portal dropdown
            }
            console.log('Regular nav link clicked - closing menu');
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

// Portal navigation functionality
function initPortalNavigation() {
    const dropdown = document.querySelector('.dropdown');
    
    // Debug logging
    console.log('Initializing portal navigation...');
    console.log('Dropdown element:', dropdown);
    console.log('Portals dropdown:', portalsDropdown);
    console.log('Portal items:', portalItems);
    
    // Check if elements exist
    if (!dropdown) {
        console.error('Dropdown element not found!');
        return;
    }
    
    if (!portalsDropdown) {
        console.error('Portals dropdown element not found!');
        return;
    }
    
    // Handle portal dropdown clicks
    portalsDropdown.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Portals dropdown clicked');
        
        // Check if we're in mobile view
        const isMobile = window.innerWidth <= 768;
        const navMenuActive = navMenu.classList.contains('active');
        
        // Toggle dropdown for both desktop and mobile
        const isActive = dropdown.classList.contains('active');
        if (isActive) {
            dropdown.classList.remove('active');
            console.log('Dropdown closed');
        } else {
            dropdown.classList.add('active');
            console.log('Dropdown opened');
        }
        
        // In mobile view, keep the nav menu open when dropdown is toggled
        if (isMobile && navMenuActive) {
            console.log('Mobile dropdown toggled, keeping nav menu open');
            // Ensure mobile menu stays open
            navMenu.classList.add('active');
            hamburger.classList.add('active');
            return;
        }
    });

    // Handle portal item clicks
    portalItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Don't prevent default - let the browser handle the new tab navigation
            e.stopPropagation();
            
            const portal = item.dataset.portal;
            console.log(`Opening ${portal} portal in new tab`);
            
            // Show loading state briefly
            const originalContent = item.innerHTML;
            item.innerHTML = '<i class="fas fa-external-link-alt"></i> Opening...';
            
            // Close dropdown and mobile menu when portal is selected
            dropdown.classList.remove('active');
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
            
            // Reset button content after a short delay
            setTimeout(() => {
                item.innerHTML = originalContent;
            }, 1000);
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (dropdown && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
            console.log('Dropdown closed by clicking outside');
        }
    });

    // Close dropdown on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dropdown.classList.contains('active')) {
            dropdown.classList.remove('active');
        }
    });

    // Handle window resize to reset dropdown
    window.addEventListener('resize', () => {
        dropdown.classList.remove('active');
    });
    
    // Initialize dropdown state
    dropdown.classList.remove('active');
    console.log('Portal navigation initialized successfully');
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
                        window.location.href = 'https://www.therapease.site/auth/login';
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
                phone: formData.get('phone'),
                inquiryType: formData.get('inquiryType'),
                subject: formData.get('subject'),
                message: formData.get('message'),
                newsletter: formData.get('newsletter') === 'on',
                privacy: formData.get('privacy') === 'on'
            };

            // Validate required fields (inquiryType, phone, newsletter, privacy are optional)
            if (!contactData.name || !contactData.email || !contactData.subject || !contactData.message) {
                showError('Please fill in all required fields (name, email, subject, message).');
                return;
            }

            try {
                showLoading(contactForm);
                
                // Enhanced contact data with additional context
                const enhancedContactData = {
                    name: contactData.name,
                    email: contactData.email,
                    phone: contactData.phone || null,
                    inquiryType: contactData.inquiryType || null,
                    subject: contactData.subject,
                    message: contactData.message,
                    newsletter: contactData.newsletter || false,
                    userAgent: navigator.userAgent,
                    referrer: document.referrer,
                    pageUrl: window.location.href
                };

                // Determine API base URL
                const apiBaseUrl = window.__THERAPEASE_API_BASE_URL__
                    || (window.location.hostname === 'localhost'
                        ? 'http://localhost:5000/api'
                        : 'https://api.therapease.site/api');

                // Send contact form to API
                const response = await fetch(`${apiBaseUrl}/contact/submit`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(enhancedContactData)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    // Show success message based on inquiry type
                    let successMessage = 'Thank you for your message! We\'ll get back to you soon.';
                    
                    if (contactData.inquiryType) {
                        switch (contactData.inquiryType) {
                            case 'demo':
                                successMessage = 'Thank you! We\'ll contact you within 24 hours to schedule your personalized demo.';
                                break;
                            case 'pricing':
                                successMessage = 'Thank you! We\'ll send you detailed pricing information within 24 hours.';
                                break;
                            case 'support':
                                successMessage = 'Thank you! Our technical support team will respond within 24 hours.';
                                break;
                            case 'partnership':
                                successMessage = 'Thank you! We\'ll review your partnership inquiry and get back to you soon.';
                                break;
                            default:
                                successMessage = result.message || 'Thank you for your message! We\'ll get back to you within 24 hours.';
                        }
                    } else {
                        successMessage = result.message || 'Thank you for your message! We\'ll get back to you within 24 hours.';
                    }

                    if (contactData.newsletter) {
                        successMessage += ' You\'ll also receive our newsletter with the latest TherapEase updates.';
                    }
                    
                    showSuccess(successMessage);
                    contactForm.reset();
                } else {
                    throw new Error(result.error || 'Failed to send message');
                }
            } catch (error) {
                console.error('Contact form error:', error);
                showError('Failed to send message. Please try again or contact us directly at support@therapease.com.');
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

    // Contact form specific validation
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        const inquiryTypeSelect = contactForm.querySelector('#inquiry-type');
        const subjectInput = contactForm.querySelector('#subject');
        const messageTextarea = contactForm.querySelector('#message');

        // Auto-fill subject based on inquiry type (only if inquiry type select exists)
        if (inquiryTypeSelect && subjectInput) {
            inquiryTypeSelect.addEventListener('change', () => {
                const inquiryType = inquiryTypeSelect.value;
                if (subjectInput.value === '' || subjectInput.value === 'Subject Line') {
                    switch (inquiryType) {
                        case 'demo':
                            subjectInput.value = 'Schedule a Demo - TherapEase';
                            break;
                        case 'pricing':
                            subjectInput.value = 'Pricing Information Request';
                            break;
                        case 'support':
                            subjectInput.value = 'Technical Support Request';
                            break;
                        case 'partnership':
                            subjectInput.value = 'Partnership Inquiry';
                            break;
                        case 'general':
                            subjectInput.value = 'General Question';
                            break;
                        default:
                            subjectInput.value = '';
                    }
                }
            });
        }

        // Character count for message (only if messageTextarea exists)
        if (messageTextarea) {
            messageTextarea.addEventListener('input', () => {
                const maxLength = 1000;
                const currentLength = messageTextarea.value.length;
                const remaining = maxLength - currentLength;
                
                // Remove existing counter
                const existingCounter = contactForm.querySelector('.char-counter');
                if (existingCounter) {
                    existingCounter.remove();
                }
                
                if (currentLength > maxLength * 0.8) {
                    const counter = document.createElement('div');
                    counter.className = 'char-counter';
                    counter.style.cssText = `
                        font-size: 0.8rem;
                        color: ${remaining < 0 ? '#ef4444' : remaining < 50 ? '#f59e0b' : '#6b7280'};
                        text-align: right;
                        margin-top: 0.25rem;
                    `;
                    counter.textContent = `${currentLength}/${maxLength} characters`;
                    messageTextarea.parentNode.appendChild(counter);
                }
            });
        }
    }
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
                // Redirect to login page instead of opening modal
                window.location.href = 'https://www.therapease.site/auth/login';
            }
        });
    });
}

// Mobile-specific functionality
function initMobileFeatures() {
    // Detect mobile device
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // Add mobile class to body
        document.body.classList.add('mobile-device');
        
        // Prevent zoom on double tap
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // Improve touch scrolling
        document.body.style.webkitOverflowScrolling = 'touch';
        document.documentElement.style.webkitOverflowScrolling = 'touch';
        
        // Fix mobile scrolling issues
        document.body.style.overflow = 'auto';
        document.body.style.height = 'auto';
        document.documentElement.style.overflow = 'auto';
        document.documentElement.style.height = 'auto';
        
        // Remove any fixed heights that might prevent scrolling
        const hero = document.querySelector('.hero');
        if (hero) {
            hero.style.minHeight = '100vh';
            hero.style.height = 'auto';
            hero.style.overflow = 'visible';
        }
        
        // Handle orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                // Recalculate viewport height for mobile browsers
                const vh = window.innerHeight * 0.01;
                document.documentElement.style.setProperty('--vh', `${vh}px`);
                
                // Ensure scrolling works after orientation change
                document.body.style.overflow = 'auto';
                document.documentElement.style.overflow = 'auto';
            }, 100);
        });
        
        // Set initial viewport height
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        // Ensure scrolling is enabled
        window.addEventListener('load', () => {
            document.body.style.overflow = 'auto';
            document.documentElement.style.overflow = 'auto';
        });
        
        console.log('Mobile features initialized with scrolling fixes');
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initPortalNavigation();
    initModals();
    initForms();
    initSmoothScrolling();
    initScrollAnimations();
    initFormValidation();
    initDemoAccounts();
    initMobileFeatures();
    
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
    closeModal: window.closeModal,
    switchToLogin: window.switchToLogin,
    switchToRegister: window.switchToRegister,
    scrollToSection: window.scrollToSection,
    showSuccess: window.showSuccess,
    showError: window.showError
};
