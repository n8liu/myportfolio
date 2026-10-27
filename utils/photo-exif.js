// Shared by the local server and the production Worker so gallery data matches.
export function createExifEnricher(records) {
    const byFilename = new Map(records.map(record => [record.filename.toLowerCase(), record]));
    return function withExif(photo) {
        const filename = photo.key.split('/').pop();
        const meta = byFilename.get(filename.toLowerCase());
        if (!meta) return photo;
        const exif = {
            camera: `${meta.camera || 'FUJIFILM'} ${meta.model || 'X100VI'}`,
            lens: meta.software ? meta.software.replace('Digital Camera ', '') : 'Fujinon 23mm F2.0 (Fixed)',
            exposure: meta.shutterSpeed || '1/250s',
            aperture: meta.aperture ? meta.aperture.replace('f/f/', 'f/') : 'f/5.6',
            iso: meta.iso ? String(meta.iso) : '200',
            location: photo.category ? photo.category.replace(/_/g, ' ').toUpperCase() : 'CALIFORNIA',
        };
        return { ...photo, ...exif, exif };
    };
}
