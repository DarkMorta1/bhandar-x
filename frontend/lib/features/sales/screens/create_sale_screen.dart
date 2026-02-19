import 'package:flutter/material.dart';

class CreateSaleScreen extends StatelessWidget {
  const CreateSaleScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Sale'),
      ),
      body: const Center(
        child: Text('Create Sale Form'),
      ),
    );
  }
}
