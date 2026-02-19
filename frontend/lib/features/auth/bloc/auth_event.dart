part of 'auth_bloc.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

class AppStarted extends AuthEvent {}

class LoginRequested extends AuthEvent {
  final String email;
  final String password;

  const LoginRequested({
    required this.email,
    required this.password,
  });

  @override
  List<Object?> get props => [email, password];
}

class RegisterRequested extends AuthEvent {
  final Map<String, dynamic> data;

  const RegisterRequested({required this.data});

  @override
  List<Object?> get props => [data];
}

class LogoutRequested extends AuthEvent {}

class ProfileUpdated extends AuthEvent {
  final Map<String, dynamic> updates;

  const ProfileUpdated({required this.updates});

  @override
  List<Object?> get props => [updates];
}
