import 'package:intl/intl.dart';

/// Format integer ke string Rupiah Indonesia.
/// Contoh: 150000 → "Rp 150.000"
String formatRupiah(int amount) {
  final formatter = NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp ',
    decimalDigits: 0,
  );
  return formatter.format(amount);
}
