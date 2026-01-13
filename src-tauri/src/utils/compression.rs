use flate2::{Compression, read::GzDecoder, write::GzEncoder};
use log::error;
use std::io::{Read, Write};

pub fn compress(data: &[u8]) -> Result<Vec<u8>, String> {
    let mut encoder = GzEncoder::new(Vec::new(), Compression::best());
    encoder
        .write_all(data)
        .and_then(|_| encoder.finish())
        .map_err(|e| {
            error!("Compression failed: {}", e);
            format!("Compression failed: {e}")
        })
}

pub fn decompress(data: &[u8]) -> Result<Vec<u8>, String> {
    let mut decoder = GzDecoder::new(data);
    let mut out = Vec::new();
    decoder.read_to_end(&mut out).map_err(|e| {
        error!("Decompression failed: {}", e);
        format!("Decompression failed: {e}")
    })?;
    Ok(out)
}
