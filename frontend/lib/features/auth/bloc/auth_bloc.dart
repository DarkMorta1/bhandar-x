import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../core/core.dart';

part 'auth_event.dart';
part 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final ApiService _apiService = ApiService();
  final StorageService _storageService = StorageService();

  AuthBloc() : super(AuthInitial()) {
    on<AppStarted>(_onAppStarted);
    on<LoginRequested>(_onLoginRequested);
    on<RegisterRequested>(_onRegisterRequested);
    on<LogoutRequested>(_onLogoutRequested);
    on<ProfileUpdated>(_onProfileUpdated);
  }

  Future<void> _onAppStarted(AppStarted event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    
    await _apiService.initialize();
    await _storageService.initialize();
    await _apiService.loadTokens();

    if (_apiService.isAuthenticated) {
      try {
        final response = await _apiService.getMe();
        if (response.statusCode == 200) {
          final userData = response.data['data']['user'];
          await _storageService.saveUser(userData);
          
          final orgData = userData['organization'];
          if (orgData != null) {
            await _storageService.saveOrganization(orgData);
          }
          
          emit(Authenticated(user: userData));
        } else {
          await _apiService.clearTokens();
          emit(Unauthenticated());
        }
      } catch (e) {
        await _apiService.clearTokens();
        emit(Unauthenticated());
      }
    } else {
      emit(Unauthenticated());
    }
  }

  Future<void> _onLoginRequested(LoginRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());

    try {
      final response = await _apiService.login(event.email, event.password);

      if (response.statusCode == 200) {
        final tokens = response.data['data']['tokens'];
        final userData = response.data['data']['user'];

        await _apiService.setTokens(tokens['accessToken'], tokens['refreshToken']);
        await _storageService.saveUser(userData);

        final orgData = userData['organization'];
        if (orgData != null) {
          await _storageService.saveOrganization(orgData);
        }

        emit(Authenticated(user: userData));
      } else {
        emit(AuthError(message: response.data['message'] ?? 'Login failed'));
      }
    } catch (e) {
      emit(AuthError(message: _getErrorMessage(e)));
    }
  }

  Future<void> _onRegisterRequested(RegisterRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());

    try {
      final response = await _apiService.register(event.data);

      if (response.statusCode == 201) {
        final tokens = response.data['data']['tokens'];
        final userData = response.data['data']['user'];

        await _apiService.setTokens(tokens['accessToken'], tokens['refreshToken']);
        await _storageService.saveUser(userData);

        final orgData = userData['organization'];
        if (orgData != null) {
          await _storageService.saveOrganization(orgData);
        }

        emit(Authenticated(user: userData));
      } else {
        emit(AuthError(message: response.data['message'] ?? 'Registration failed'));
      }
    } catch (e) {
      emit(AuthError(message: _getErrorMessage(e)));
    }
  }

  Future<void> _onLogoutRequested(LogoutRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());

    try {
      await _apiService.logout();
    } catch (e) {
      // Ignore logout errors
    }

    await _apiService.clearTokens();
    await _storageService.clearAll();

    emit(Unauthenticated());
  }

  Future<void> _onProfileUpdated(ProfileUpdated event, Emitter<AuthState> emit) async {
    if (state is Authenticated) {
      final currentState = state as Authenticated;
      final updatedUser = {...currentState.user, ...event.updates};
      await _storageService.saveUser(updatedUser);
      emit(Authenticated(user: updatedUser));
    }
  }

  String _getErrorMessage(dynamic error) {
    if (error is Exception) {
      return error.toString().replaceAll('Exception: ', '');
    }
    return 'An unexpected error occurred';
  }
}
