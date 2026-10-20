CREATE TABLE IF NOT EXISTS leads(id TEXT PRIMARY KEY,data TEXT,step INT,done INT,sent INT,updated INT);
CREATE INDEX IF NOT EXISTS i_sent ON leads(sent,updated);
