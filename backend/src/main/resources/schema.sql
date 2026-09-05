CREATE TABLE IF NOT EXISTS entries (
 source VARCHAR(8) NOT NULL, external_id VARCHAR(80) NOT NULL,
 account VARCHAR(80) NOT NULL, currency VARCHAR(3) NOT NULL,
 amount DECIMAL(19,2) NOT NULL, reference VARCHAR(120) NOT NULL,
 PRIMARY KEY (source, external_id)
);
CREATE TABLE IF NOT EXISTS resolutions (
 source VARCHAR(8) NOT NULL, external_id VARCHAR(80) NOT NULL,
 reason VARCHAR(1000) NOT NULL, actor VARCHAR(80) NOT NULL,
 resolved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(source, external_id),
 FOREIGN KEY(source, external_id) REFERENCES entries(source, external_id)
);
