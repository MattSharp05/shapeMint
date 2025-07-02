-- Creating enums
CREATE TYPE source_type AS ENUM ('text', 'image');
CREATE TYPE model_status AS ENUM ('generating', 'ready', 'failed');
CREATE TYPE provider_type AS ENUM ('printify', 'craftcloud', 'jlcpcb', 'xometry');
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'manufacturing', 'shipped', 'delivered', 'cancelled');

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    stripe_customer_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create models table
CREATE TABLE models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    source_type source_type NOT NULL,
    source_content TEXT NOT NULL,
    model_url TEXT,
    thumbnail_url TEXT,
    is_public BOOLEAN DEFAULT false,
    is_marketplace_listed BOOLEAN DEFAULT false,
    price DECIMAL(10,2),
    status model_status DEFAULT 'generating',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create manufacturing_quotes table
CREATE TABLE manufacturing_quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID REFERENCES models(id) NOT NULL,
    provider provider_type NOT NULL,
    material TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    shipping_price DECIMAL(10,2) NOT NULL,
    estimated_days INTEGER NOT NULL,
    quote_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) NOT NULL,
    model_id UUID REFERENCES models(id) NOT NULL,
    quote_id UUID REFERENCES manufacturing_quotes(id) NOT NULL,
    status order_status DEFAULT 'pending',
    stripe_payment_intent_id TEXT,
    shipping_address JSONB NOT NULL,
    tracking_number TEXT,
    tracking_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create model_likes table
CREATE TABLE model_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) NOT NULL,
    model_id UUID REFERENCES models(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, model_id)
);

-- Create indexes
CREATE INDEX idx_models_user_id ON models(user_id);
CREATE INDEX idx_models_visibility ON models(is_public, is_marketplace_listed);
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_model_likes_user_model ON model_likes(user_id, model_id);

-- Add RLS policies (who can access and modify what data in each table)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_likes ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid() = id);

-- Models policies
CREATE POLICY "Users can view public models" ON models
    FOR SELECT USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can manage their own models" ON models
    FOR ALL USING (user_id = auth.uid());

-- Manufacturing quotes policies
CREATE POLICY "Users can view quotes for their models" ON manufacturing_quotes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM models
            WHERE models.id = manufacturing_quotes.model_id
            AND models.user_id = auth.uid()
        )
    );

-- Orders policies
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create orders" ON orders
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Model likes policies
CREATE POLICY "Users can manage their own likes" ON model_likes
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view likes on public models" ON model_likes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM models
            WHERE models.id = model_likes.model_id
            AND (models.is_public = true OR models.user_id = auth.uid())
        )
    );

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_models_updated_at
    BEFORE UPDATE ON models
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
