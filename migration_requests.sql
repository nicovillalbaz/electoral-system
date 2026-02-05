-- Add columns for Requests and Financial Tracking
ALTER TABLE persons 
ADD COLUMN requests JSONB DEFAULT '[]'::jsonb,
ADD COLUMN has_financial_needs BOOLEAN DEFAULT FALSE,
ADD COLUMN financial_needs_fulfilled BOOLEAN DEFAULT FALSE,
ADD COLUMN financial_amount NUMERIC(15, 0) DEFAULT 0;
