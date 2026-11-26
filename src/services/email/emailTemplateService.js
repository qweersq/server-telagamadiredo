const fs = require('fs');
const path = require('path');

class EmailTemplateService {
  /**
   * Render email template with data
   */
  static render(templateName, data) {
    const templatePath = path.join(__dirname, '../../templates/emails', `${templateName}.html`);
    let template = fs.readFileSync(templatePath, 'utf-8');
    
    // Replace placeholders {{variable}}
    for (const key in data) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(placeholder, data[key] || '');
    }
    
    return template;
  }

  /**
   * Format currency for templates
   */
  static formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Format date for templates
   */
  static formatDate(date) {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}

module.exports = EmailTemplateService;

