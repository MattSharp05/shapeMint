import { supabase } from '../supabaseClient';

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  category: 'general' | 'technical' | 'billing' | 'marketplace' | 'manufacturing' | 'partnership';
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  category: string;
  status: 'pending' | 'in-progress' | 'resolved' | 'closed';
  user_id?: string;
  created_at: string;
  updated_at: string;
  admin_notes?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface ContactResponse {
  success: boolean;
  message?: string;
  error?: string;
  submissionId?: string;
}

export class ContactService {
  private static instance: ContactService;

  private constructor() {}

  public static getInstance(): ContactService {
    if (!ContactService.instance) {
      ContactService.instance = new ContactService();
    }
    return ContactService.instance;
  }

  /**
   * Submit a contact form and store it in the database
   */
  async submitContactForm(formData: ContactFormData): Promise<ContactResponse> {
    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      // Determine priority based on category
      const priority = this.determinePriority(formData.category);

      // Insert contact submission into database
      const { data, error } = await supabase
        .from('contact_submissions')
        .insert({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
          category: formData.category,
          status: 'pending',
          user_id: userId || null,
          priority: priority,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error submitting contact form:', error);
        return {
          success: false,
          error: 'Failed to submit contact form. Please try again.'
        };
      }

      // Send notification email to admin (optional)
      await this.sendAdminNotification(formData, data.id);

      return {
        success: true,
        message: 'Thank you for your message! We\'ll get back to you within 24 hours.',
        submissionId: data.id
      };

    } catch (error) {
      console.error('Error in submitContactForm:', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    }
  }

  /**
   * Get contact submissions for admin dashboard
   */
  async getContactSubmissions(status?: string): Promise<ContactSubmission[]> {
    try {
      let query = supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching contact submissions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getContactSubmissions:', error);
      return [];
    }
  }

  /**
   * Update contact submission status (for admin use)
   */
  async updateSubmissionStatus(
    submissionId: string, 
    status: ContactSubmission['status'], 
    adminNotes?: string
  ): Promise<ContactResponse> {
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .update({
          status: status,
          admin_notes: adminNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (error) {
        console.error('Error updating submission status:', error);
        return {
          success: false,
          error: 'Failed to update submission status.'
        };
      }

      return {
        success: true,
        message: 'Submission status updated successfully.'
      };

    } catch (error) {
      console.error('Error in updateSubmissionStatus:', error);
      return {
        success: false,
        error: 'An unexpected error occurred.'
      };
    }
  }

  /**
   * Get user's own contact submissions
   */
  async getUserSubmissions(): Promise<ContactSubmission[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user submissions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserSubmissions:', error);
      return [];
    }
  }

  /**
   * Determine priority based on category
   */
  private determinePriority(category: string): 'low' | 'medium' | 'high' {
    switch (category) {
      case 'billing':
      case 'technical':
        return 'high';
      case 'manufacturing':
      case 'marketplace':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Send admin notification (optional - can be implemented with email service)
   */
  private async sendAdminNotification(formData: ContactFormData, submissionId: string): Promise<void> {
    try {
      // This could integrate with your email service (SendGrid, AWS SES, etc.)
      // For now, we'll just log it
      console.log('📧 Admin notification:', {
        submissionId,
        category: formData.category,
        subject: formData.subject,
        email: formData.email
      });

      // Example: Send to admin email via Edge Function
      // await fetch('/api/notify-admin', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ formData, submissionId })
      // });

    } catch (error) {
      console.warn('Failed to send admin notification:', error);
    }
  }
}

export const contactService = ContactService.getInstance(); 