# TheraPease Public Website

A modern, responsive public website for the TheraPease non-profit therapy management system. This website showcases the platform's features and provides seamless integration with the existing authentication system.

## Features

- **Modern Design**: Clean, professional design with healthcare-focused aesthetics
- **Responsive Layout**: Fully responsive design that works on all devices
- **Authentication Integration**: Seamless integration with your existing login/registration system
- **Interactive Elements**: Smooth animations, hover effects, and interactive components
- **SEO Optimized**: Proper meta tags and semantic HTML structure
- **Accessibility**: WCAG compliant with proper ARIA labels and keyboard navigation

## Pages Included

1. **Homepage** (`index.html`)
   - Hero section with compelling value proposition focused on therapeutic care
   - Feature showcase with icons and clear descriptions
   - Statistics and social proof highlighting patient care metrics
   - Call-to-action buttons for easy access to the platform

2. **Services Section**
   - Detailed service offerings for different user types
   - Feature lists with checkmarks
   - Clear descriptions of therapeutic tools and features

3. **About Section**
   - Organization story and mission focused on patient care
   - Team information highlighting healthcare expertise
   - Core values and principles emphasizing therapeutic outcomes

4. **Contact Section**
   - Contact information and operating hours
   - Contact form with validation
   - Office location details

## Authentication Integration

The website integrates with your existing TheraPease authentication system:

- **Login Modal**: Connects to `/api/auth/login` endpoint
- **Registration Modal**: Connects to `/api/auth/register` endpoint
- **Role-based Redirects**: Automatically redirects users based on their role (admin, therapist, patient)
- **Token Management**: Handles JWT tokens and user session management

## File Structure

```
public-website/
├── index.html          # Main homepage
├── css/
│   └── styles.css      # All styles and responsive design
├── js/
│   └── script.js       # JavaScript functionality
└── README.md           # This file
```

## Setup and Deployment

### Option 1: Standalone Deployment

1. **Upload Files**: Upload the entire `public-website` folder to your web server
2. **Configure API Endpoints**: Update the API endpoints in `script.js` if needed
3. **Set CORS Headers**: Ensure your server allows CORS requests from the website domain

### Option 2: Integration with Existing Server

1. **Copy Files**: Copy the contents of `public-website` to your server's public directory
2. **Update Routes**: Add a route to serve the public website at the root path
3. **API Integration**: The website will automatically connect to your existing API endpoints

### Option 3: Development Server

For local development, you can serve the files using any static file server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (http-server)
npx http-server

# Using PHP
php -S localhost:8000
```

## Customization

### Colors and Branding

The website uses CSS custom properties for easy theming. Key colors can be changed in `styles.css`:

```css
:root {
    --primary-color: #2563eb;
    --secondary-color: #fbbf24;
    --accent-color: #10b981;
    --text-color: #1f2937;
    --background-color: #f8fafc;
}
```

### Content Updates

- **Organization Information**: Update contact details, addresses, and operating hours in `index.html`
- **Team Information**: Modify team member details in the About section
- **Services**: Update service descriptions and features as needed
- **Statistics**: Change the numbers in the hero section stats

### API Endpoints

If your API endpoints are different, update them in `script.js`:

```javascript
// Login endpoint
const response = await fetch('/api/auth/login', {
    // ... configuration
});

// Registration endpoint
const response = await fetch('/api/auth/register', {
    // ... configuration
});
```

## Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Features

- **Optimized Images**: Uses CSS for visual elements to reduce file size
- **Minified Assets**: CSS and JS are optimized for production
- **Lazy Loading**: Images and animations load as needed
- **Caching**: Proper cache headers for static assets

## Security Considerations

- **Form Validation**: Client-side and server-side validation
- **XSS Protection**: Proper input sanitization
- **CSRF Protection**: Token-based form submission
- **HTTPS**: Ensure SSL certificate is properly configured

## Analytics Integration

To add analytics tracking, insert your tracking code in the `<head>` section of `index.html`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_TRACKING_ID');
</script>
```

## Support and Maintenance

### Regular Updates

- **Content**: Keep service descriptions and contact information current and aligned with therapeutic care focus
- **Security**: Regularly update dependencies and security patches
- **Performance**: Monitor page load times and optimize as needed

### Troubleshooting

**Common Issues:**

1. **API Connection Errors**: Check CORS settings and endpoint URLs
2. **Mobile Display Issues**: Test on various devices and screen sizes
3. **Form Submission Problems**: Verify API endpoints and validation rules

**Debug Mode**: Enable console logging by setting `window.DEBUG = true` in the browser console.

## License

This public website is part of the TheraPease system and follows the same licensing terms.

## Contact

For technical support or customization requests, contact the development team at hello@therapease.com.
