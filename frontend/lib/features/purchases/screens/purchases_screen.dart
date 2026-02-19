import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class PurchasesScreen extends StatelessWidget {
  const PurchasesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Purchases'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: const Center(
        child: Text('Purchases List'),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/purchases/create'),
        icon: const Icon(Icons.add),
        label: const Text('New Purchase'),
      ),
    );
  }
}
