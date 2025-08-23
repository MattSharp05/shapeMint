-- Create contact_submissions table
CREATE TABLE IF NOT EXISTS public.contact_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'low' CHECK (priority IN ('low', 'medium', 'high')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON public.contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_priority ON public.contact_submissions(priority);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_user_id ON public.contact_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON public.contact_submissions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can view their own submissions
CREATE POLICY "Users can view own submissions" ON public.contact_submissions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create submissions
CREATE POLICY "Users can create submissions" ON public.contact_submissions
    FOR INSERT WITH CHECK (true);

-- Users can update their own submissions (for status updates)
CREATE POLICY "Users can update own submissions" ON public.contact_submissions
    FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all submissions (you'll need to set up admin role)
-- CREATE POLICY "Admins can view all submissions" ON public.contact_submissions
--     FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contact_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_contact_submissions_updated_at
    BEFORE UPDATE ON public.contact_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_contact_submissions_updated_at();

-- Add comments
COMMENT ON TABLE public.contact_submissions IS 'Stores contact form submissions from users';
COMMENT ON COLUMN public.contact_submissions.category IS 'Category of the inquiry (general, technical, billing, etc.)';
COMMENT ON COLUMN public.contact_submissions.status IS 'Current status of the submission';
COMMENT ON COLUMN public.contact_submissions.priority IS 'Priority level based on category and content';
COMMENT ON COLUMN public.contact_submissions.admin_notes IS 'Internal notes for admin use'; 