import 'package:flutter/material.dart';

class CreatePurchaseScreen extends StatelessWidget {
  const CreatePurchaseScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Purchase'),
      ),
      body: const Center(
        child: Text('Create Purchase Form'),
      ),
    );
  }
}
