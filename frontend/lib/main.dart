import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:flex_color_scheme/flex_color_scheme.dart';
import 'package:google_fonts/google_fonts.dart';

import 'core/core.dart';
import 'features/features.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize local storage
  await initializeStorage();
  
  runApp(const BhandarXApp());
}

class BhandarXApp extends StatelessWidget {
  const BhandarXApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ScreenUtilInit(
      designSize: const Size(375, 812),
      minTextAdapt: true,
      splitScreenMode: true,
      builder: (context, child) {
        return MultiBlocProvider(
          providers: [
            BlocProvider(create: (_) => AuthBloc()..add(AppStarted())),
            BlocProvider(create: (_) => ThemeCubit()),
          ],
          child: BlocBuilder<ThemeCubit, ThemeMode>(
            builder: (context, themeMode) {
              return MaterialApp.router(
                title: 'Bhandar X',
                debugShowCheckedModeBanner: false,
                theme: FlexThemeData.light(
                  scheme: FlexScheme.blue,
                  surfaceMode: FlexSurfaceMode.levelSurfacesLowScaffold,
                  blendLevel: 7,
                  subThemesData: const FlexSubThemesData(
                    blendOnLevel: 10,
                    blendOnColors: false,
                    useM2StyleDividerInM3: true,
                    alignedDropdown: true,
                    useInputDecoratorThemeInDialogs: true,
                  ),
                  visualDensity: FlexColorScheme.comfortablePlatformDensity,
                  useMaterial3: true,
                  swapLegacyOnMaterial3: true,
                  fontFamily: GoogleFonts.inter().fontFamily,
                ),
                darkTheme: FlexThemeData.dark(
                  scheme: FlexScheme.blue,
                  surfaceMode: FlexSurfaceMode.levelSurfacesLowScaffold,
                  blendLevel: 13,
                  subThemesData: const FlexSubThemesData(
                    blendOnLevel: 20,
                    useM2StyleDividerInM3: true,
                    alignedDropdown: true,
                    useInputDecoratorThemeInDialogs: true,
                  ),
                  visualDensity: FlexColorScheme.comfortablePlatformDensity,
                  useMaterial3: true,
                  swapLegacyOnMaterial3: true,
                  fontFamily: GoogleFonts.inter().fontFamily,
                ),
                themeMode: themeMode,
                routerConfig: AppRouter.router,
              );
            },
          ),
        );
      },
    );
  }
}

Future<void> initializeStorage() async {
  // Initialize SharedPreferences and Hive
  // This will be implemented in the storage service
}
