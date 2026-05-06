import 'package:intl/intl.dart';

String formatRupiah(int amount) {
  final formatter = NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp ',
    decimalDigits: 0,
  );
  return formatter.format(amount);
}

String formatTanggal(String isoString) {
  final dt = DateTime.parse(isoString).toLocal();
  return DateFormat('d MMMM yyyy, HH:mm', 'id_ID').format(dt);
}

String formatMenit(int menit) {
  final jam = menit ~/ 60;
  final sisa = menit % 60;
  if (jam == 0) return '$sisa menit';
  if (sisa == 0) return '$jam jam';
  return '$jam jam $sisa menit';
}
