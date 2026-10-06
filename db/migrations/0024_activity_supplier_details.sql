ALTER TABLE activities
  ADD COLUMN supplier_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN supplier_name VARCHAR(180),
  ADD COLUMN supplier_contact VARCHAR(180),
  ADD COLUMN supplier_phone VARCHAR(80),
  ADD COLUMN supplier_details TEXT;
