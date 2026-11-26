class CurrencyHelper {
  static toRupiah(value) {
    return 'Rp ' + Number(value || 0).toLocaleString('id-ID');
  }
}

module.exports = CurrencyHelper;
