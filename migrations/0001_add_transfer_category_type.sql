-- Migration: Add 'transfer' category type
-- Description: Adds support for 'transfer' category type and updates existing transfer categories

-- Update existing categories named 'Trasferimenti' or 'Transfer' to use the transfer type
UPDATE categories 
SET type = 'transfer' 
WHERE LOWER(name) IN ('trasferimenti', 'transfer', 'transfers');
