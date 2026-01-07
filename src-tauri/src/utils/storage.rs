use crate::utils::compression::{compress, decompress};
use base64::Engine;
use keyring::Entry;
use log::{debug, error, info};
use serde::{Deserialize, Serialize};

const B64: base64::engine::GeneralPurpose = base64::engine::general_purpose::STANDARD;

pub struct KeyringStorage<T> {
    service: &'static str,
    base_key: &'static str,
    _phantom: std::marker::PhantomData<T>,
}

impl<T: Serialize + for<'de> Deserialize<'de>> KeyringStorage<T> {
    pub const fn new(service: &'static str, base_key: &'static str) -> Self {
        Self {
            service,
            base_key,
            _phantom: std::marker::PhantomData,
        }
    }

    fn entry(&self, suffix: &str) -> Result<Entry, String> {
        Entry::new(self.service, &format!("{}_{}", self.base_key, suffix)).map_err(|e| {
            error!("Keyring access failed: {}", e);
            format!("Keyring access failed: {e}")
        })
    }

    pub fn save(&self, data: &T, chunk_size: usize) -> Result<(), String> {
        info!("Saving {} to keyring", self.base_key);
        self.clear()?;

        let json = serde_json::to_vec(data).map_err(|e| {
            error!("Failed to serialize data: {}", e);
            format!("Serialize failed: {e}")
        })?;
        let encoded = B64.encode(compress(&json)?);

        let chunks: Vec<_> = encoded.as_bytes().chunks(chunk_size).collect();

        self.entry("n")?
            .set_password(&chunks.len().to_string())
            .map_err(|e| {
                error!("Failed to save chunk count: {}", e);
                format!("Failed to save chunk count: {e}")
            })?;

        for (i, chunk) in chunks.iter().enumerate() {
            let chunk_str = std::str::from_utf8(chunk).unwrap();
            self.entry(&i.to_string())?
                .set_password(chunk_str)
                .map_err(|e| {
                    error!("Failed to save chunk {}: {}", i, e);
                    format!("Failed to save chunk {i}: {e}")
                })?;
        }

        info!("{} saved ({} chunks)", self.base_key, chunks.len());
        Ok(())
    }

    pub fn load(&self) -> Option<T> {
        debug!("Loading {} from keyring", self.base_key);

        let count: usize = self.entry("n").ok()?.get_password().ok()?.parse().ok()?;

        let encoded: String = (0..count)
            .map(|i| self.entry(&i.to_string()).ok()?.get_password().ok())
            .collect::<Option<_>>()?;

        let json = decompress(&B64.decode(&encoded).ok()?).ok()?;
        let data = serde_json::from_slice(&json).ok()?;

        debug!("{} loaded ({} chunks)", self.base_key, count);
        Some(data)
    }

    pub fn clear(&self) -> Result<(), String> {
        let count: usize = self
            .entry("n")
            .and_then(|e| e.get_password().map_err(|e| e.to_string()))
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(0);

        if count == 0 {
            return Ok(());
        }

        info!("Clearing {} ({} chunks)", self.base_key, count);
        let _ = self
            .entry("n")
            .map(|e| e.delete_credential())
            .map_err(|e| {
                error!("Failed to delete credential 'n': {}", e);
                e
            });
        for i in 0..count {
            let _ = self
                .entry(&i.to_string())
                .map(|e| e.delete_credential())
                .map_err(|e| {
                    error!("Failed to delete credential '{}': {}", i, e);
                    e
                });
        }

        Ok(())
    }
}
