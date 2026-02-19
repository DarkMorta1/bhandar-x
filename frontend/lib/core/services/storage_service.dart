import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../constants/constants.dart';

class StorageService {
  static final StorageService _instance = StorageService._internal();
  factory StorageService() => _instance;
  StorageService._internal();

  late SharedPreferences _prefs;
  late Box _cacheBox;
  late Box _offlineBox;

  Future<void> initialize() async {
    _prefs = await SharedPreferences.getInstance();
    
    // Initialize Hive
    await Hive.initFlutter();
    
    // Open boxes
    _cacheBox = await Hive.openBox('cache');
    _offlineBox = await Hive.openBox('offline_queue');
  }

  // User data
  Future<void> saveUser(Map<String, dynamic> user) async {
    await _prefs.setString(ApiConstants.userKey, jsonEncode(user));
  }

  Map<String, dynamic>? getUser() {
    final userStr = _prefs.getString(ApiConstants.userKey);
    if (userStr != null) {
      return jsonDecode(userStr);
    }
    return null;
  }

  Future<void> clearUser() async {
    await _prefs.remove(ApiConstants.userKey);
  }

  // Organization data
  Future<void> saveOrganization(Map<String, dynamic> org) async {
    await _prefs.setString(ApiConstants.organizationKey, jsonEncode(org));
  }

  Map<String, dynamic>? getOrganization() {
    final orgStr = _prefs.getString(ApiConstants.organizationKey);
    if (orgStr != null) {
      return jsonDecode(orgStr);
    }
    return null;
  }

  Future<void> clearOrganization() async {
    await _prefs.remove(ApiConstants.organizationKey);
  }

  // Settings
  Future<void> saveSettings(Map<String, dynamic> settings) async {
    await _prefs.setString(ApiConstants.settingsKey, jsonEncode(settings));
  }

  Map<String, dynamic>? getSettings() {
    final settingsStr = _prefs.getString(ApiConstants.settingsKey);
    if (settingsStr != null) {
      return jsonDecode(settingsStr);
    }
    return null;
  }

  // Cache operations
  Future<void> cacheData(String key, dynamic data, {Duration? expiry}) async {
    final cacheEntry = {
      'data': data,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
      'expiry': expiry?.inMilliseconds,
    };
    await _cacheBox.put(key, cacheEntry);
  }

  dynamic getCachedData(String key) {
    final cacheEntry = _cacheBox.get(key);
    if (cacheEntry == null) return null;

    final expiry = cacheEntry['expiry'];
    if (expiry != null) {
      final timestamp = cacheEntry['timestamp'];
      final now = DateTime.now().millisecondsSinceEpoch;
      if (now - timestamp > expiry) {
        _cacheBox.delete(key);
        return null;
      }
    }

    return cacheEntry['data'];
  }

  Future<void> clearCache() async {
    await _cacheBox.clear();
  }

  // Offline queue operations
  Future<void> addToOfflineQueue(String operation, Map<String, dynamic> data) async {
    final queueItem = {
      'id': DateTime.now().millisecondsSinceEpoch.toString(),
      'operation': operation,
      'data': data,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
      'retryCount': 0,
    };
    await _offlineBox.add(queueItem);
  }

  List<Map<String, dynamic>> getOfflineQueue() {
    return _offlineBox.values.cast<Map<String, dynamic>>().toList();
  }

  Future<void> removeFromOfflineQueue(String id) async {
    final key = _offlineBox.keys.firstWhere(
      (k) => _offlineBox.get(k)['id'] == id,
      orElse: () => null,
    );
    if (key != null) {
      await _offlineBox.delete(key);
    }
  }

  Future<void> updateRetryCount(String id, int count) async {
    final key = _offlineBox.keys.firstWhere(
      (k) => _offlineBox.get(k)['id'] == id,
      orElse: () => null,
    );
    if (key != null) {
      final item = _offlineBox.get(key);
      item['retryCount'] = count;
      await _offlineBox.put(key, item);
    }
  }

  Future<void> clearOfflineQueue() async {
    await _offlineBox.clear();
  }

  // Clear all data
  Future<void> clearAll() async {
    await _prefs.clear();
    await _cacheBox.clear();
    await _offlineBox.clear();
  }
}

// Global instance
final storageService = StorageService();
