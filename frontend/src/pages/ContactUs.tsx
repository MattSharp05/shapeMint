import React, { useState } from 'react';
import { Mail, Send, MessageCircle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { contactService, ContactFormData } from '../services/contactService';

const faqs = [
  {
    id: 1,
    question: "How long does it take to generate a 3D model?",
    answer: "Most 3D models are generated in under 60 seconds. Complex designs with high quality settings may take up to 2-3 minutes."
  },
  {
    id: 2,
    question: "What file formats do you provide?",
    answer: "We provide STL, OBJ, and 3MF files with every purchase. These formats are compatible with all major 3D printers and modeling software."
  },
  {
    id: 3,
    question: "Can I use the models commercially?",
    answer: "Yes! All models come with full commercial usage rights. You can print and sell physical items made from our designs."
  },
  {
    id: 4,
    question: "What's the difference between digital download and physical print?",
    answer: "Digital download gives you the 3D files to print yourself. Physical print means we manufacture and ship the item to you using our partner network."
  },
  {
    id: 5,
    question: "How much does 3D printing cost?",
    answer: "Physical printing costs vary by size, material, and complexity. Most items range from $15-50 including shipping. You'll see exact pricing before ordering."
  },
  {
    id: 6,
    question: "Can I modify the generated models?",
    answer: "Absolutely! You receive the full 3D files and can modify them in any 3D modeling software like Blender, Fusion 360, or Tinkercad."
  },
  {
    id: 7,
    question: "What if I'm not satisfied with my generated model?",
    answer: "We offer unlimited regenerations with different prompts and settings. If you're still not satisfied, contact us for a full refund within 30 days."
  },
  {
    id: 8,
    question: "Do you offer bulk discounts?",
    answer: "Yes! Contact us for custom pricing on orders of 10+ models or for educational institutions and businesses."
  },
  {
    id: 9,
    question: "How do I upload my design to the marketplace?",
    answer: "After generating a model, click 'Upload to Marketplace' and fill out the listing details. We review submissions within 24 hours."
  },
  {
    id: 10,
    question: "What materials can I print with?",
    answer: "Our partner network supports PLA, ABS, PETG, TPU, wood-fill, metal-fill, and specialty materials. Material availability depends on your chosen vendor."
  }
];

export function ContactUs() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general'
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmissionError(null);
    
    try {
      const result = await contactService.submitContactForm(formData);
      
      if (result.success) {
        setSubmitted(true);
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: '',
          category: 'general'
        });
        
        // Reset success message after 5 seconds
        setTimeout(() => setSubmitted(false), 5000);
      } else {
        setSubmissionError(result.error || 'Failed to submit form. Please try again.');
      }
    } catch (error) {
      console.error('Contact form submission error:', error);
      setSubmissionError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFaq = (id: number) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Contact Us
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Have questions? We're here to help! Reach out to our team or browse our frequently asked questions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <Card className="p-8">
              <div className="flex items-center space-x-2 mb-6">
                <MessageCircle className="h-6 w-6 text-purple-600" />
                <h2 className="text-2xl font-bold text-gray-900">Send us a message</h2>
              </div>

              {submitted && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Send className="h-5 w-5 text-green-600" />
                    <span className="text-green-800 font-medium">Message sent successfully!</span>
                  </div>
                  <p className="text-green-700 text-sm mt-1">
                    We'll get back to you within 24 hours.
                  </p>
                </div>
              )}

              {submissionError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-red-600">⚠️</span>
                    <p className="text-sm text-red-700">{submissionError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="general">General Inquiry</option>
                    <option value="technical">Technical Support</option>
                    <option value="billing">Billing & Payments</option>
                    <option value="marketplace">Marketplace</option>
                    <option value="manufacturing">3D Printing</option>
                    <option value="partnership">Partnership</option>
                  </select>
                </div>

                <Input
                  label="Subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    placeholder="Tell us how we can help you..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                    rows={6}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  loading={submitting}
                  className="w-full"
                  size="lg"
                  icon={Send}
                >
                  {submitting ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            </Card>

            {/* Contact Info */}
            <div className="mt-8">
              <Card className="p-6 text-center max-w-sm mx-auto">
                <Mail className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                <p className="text-gray-600 text-sm">support@shapemint.com</p>
              </Card>
            </div>
          </div>

          {/* FAQ Section */}
          <div>
            <div className="flex items-center space-x-2 mb-6">
              <HelpCircle className="h-6 w-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq) => (
                <Card key={faq.id} className="overflow-hidden">
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900 pr-4">
                      {faq.question}
                    </span>
                    {expandedFaq === faq.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    )}
                  </button>
                  
                  {expandedFaq === faq.id && (
                    <div className="px-6 pb-4 border-t border-gray-100">
                      <p className="text-gray-600 pt-4 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* Additional Help */}
            {/* <Card className="p-6 mt-8 bg-blue-50 border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                Still need help?
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Can't find what you're looking for? Our support team is available 24/7 to assist you.
              </p>
              <Button size="sm" variant="outline">
                Live Chat
              </Button>
            </Card> */}
          </div>
        </div>
      </div>
    </div>
  );
}