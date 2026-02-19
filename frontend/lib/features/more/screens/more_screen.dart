import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('More'),
      ),
      body: ListView(
        children: [
          ListTile(
            leading: const Icon(Icons.shopping_bag_outlined),
            title: const Text('Purchases'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/purchases'),
          ),
          ListTile(
            leading: const Icon(Icons.people_outlined),
            title: const Text('Customers'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/customers'),
          ),
          ListTile(
            leading: const Icon(Icons.local_shipping_outlined),
            title: const Text('Suppliers'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/suppliers'),
          ),
          ListTile(
            leading: const Icon(Icons.bar_chart_outlined),
            title: const Text('Reports'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/reports'),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.settings_outlined),
            title: const Text('Settings'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/settings'),
          ),
        ],
      ),
    );
  }
}
