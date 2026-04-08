CREATE TABLE IF NOT EXISTS assignments (
  id SERIAL PRIMARY KEY,
  assignment_code VARCHAR(20) UNIQUE NOT NULL,  -- FW-2401 など
  title VARCHAR(200) NOT NULL,
  location VARCHAR(200),
  team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  assigned_worker_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority VARCHAR(10) DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  start_date DATE,
  end_date DATE,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
