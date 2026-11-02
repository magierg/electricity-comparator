import '@testing-library/jest-dom';

if (typeof File !== 'undefined' && typeof File.prototype.text !== 'function') {
  File.prototype.text = function text() {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}
