import 'package:flutter/material.dart';

class AppColors {
  // ─── Brand primary (biru perjalanan) ─────────────────────────────────────
  static const Color primary = Color(0xFF1565C0);
  static const Color primaryLight = Color(0xFF1E88E5);
  static const Color primaryDark = Color(0xFF0D47A1);
  static const Color onPrimary = Colors.white;

  // ─── Secondary (teal/hijau alam) ─────────────────────────────────────────
  static const Color secondary = Color(0xFF00897B);
  static const Color secondaryLight = Color(0xFF4DB6AC);
  static const Color onSecondary = Colors.white;

  // ─── Accent (oranye marker destinasi di peta) ─────────────────────────────
  static const Color accent = Color(0xFFEF6C00);
  static const Color accentLight = Color(0xFFFF9800);
  static const Color onAccent = Colors.white;

  // ─── Status ───────────────────────────────────────────────────────────────
  static const Color success = Color(0xFF2E7D32);
  static const Color onSuccess = Colors.white;
  static const Color error = Color(0xFFC62828);
  static const Color onError = Colors.white;
  static const Color warning = Color(0xFFF57F17);

  // ─── Background & Surface ─────────────────────────────────────────────────
  static const Color background = Color(0xFFF5F7FA);
  static const Color surface = Colors.white;
  static const Color surfaceVariant = Color(0xFFECEFF1);

  // ─── Teks ─────────────────────────────────────────────────────────────────
  static const Color textPrimary = Color(0xFF1A1A2E);
  static const Color textSecondary = Color(0xFF607D8B);
  static const Color textHint = Color(0xFFB0BEC5);

  // ─── Peta ─────────────────────────────────────────────────────────────────
  static const Color mapRoute = primary;
  static const Color mapMarkerStart = Color(0xFF2E7D32);
  static const Color mapMarkerDestination = accent;

  // ─── ColorScheme siap pakai untuk MaterialApp ─────────────────────────────
  static ColorScheme get colorScheme => ColorScheme(
        brightness: Brightness.light,
        primary: primary,
        onPrimary: onPrimary,
        primaryContainer: Color(0xFFBBDEFB),
        onPrimaryContainer: primaryDark,
        secondary: secondary,
        onSecondary: onSecondary,
        secondaryContainer: Color(0xFFB2DFDB),
        onSecondaryContainer: Color(0xFF004D40),
        tertiary: accent,
        onTertiary: onAccent,
        tertiaryContainer: Color(0xFFFFE0B2),
        onTertiaryContainer: Color(0xFFE65100),
        error: error,
        onError: onError,
        errorContainer: Color(0xFFFFCDD2),
        onErrorContainer: Color(0xFFB71C1C),
        surface: surface,
        onSurface: textPrimary,
        onSurfaceVariant: textSecondary,
        outline: Color(0xFFCFD8DC),
        outlineVariant: Color(0xFFECEFF1),
        shadow: Colors.black,
        scrim: Colors.black,
        inverseSurface: Color(0xFF1A1A2E),
        onInverseSurface: Colors.white,
        inversePrimary: primaryLight,
        surfaceContainerHighest: surfaceVariant,
      );
}
