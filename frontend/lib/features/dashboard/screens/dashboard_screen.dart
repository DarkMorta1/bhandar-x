import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/core.dart';
import '../widgets/widgets.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic> _dashboardData = {};
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final apiService = ApiService();
      final response = await apiService.get(ApiConstants.dashboardSummary);

      if (response.statusCode == 200) {
        setState(() {
          _dashboardData = response.data['data'] ?? {};
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = response.data['message'] ?? 'Failed to load dashboard';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Network error. Please try again.';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(
      symbol: AppConstants.currencySymbol,
      locale: 'en_IN',
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {
              // TODO: Show notifications
            },
          ),
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () {
              context.push('/profile');
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadDashboardData,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(_error!),
                        SizedBox(height: 16.h),
                        ElevatedButton(
                          onPressed: _loadDashboardData,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  )
                : SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: EdgeInsets.all(16.w),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Summary Cards
                        GridView.count(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          crossAxisCount: 2,
                          crossAxisSpacing: 12.w,
                          mainAxisSpacing: 12.h,
                          childAspectRatio: 1.3,
                          children: [
                            SummaryCard(
                              title: "Today's Sales",
                              value: currencyFormat.format(
                                _dashboardData['todaySales']?['amount'] ?? 0,
                              ),
                              subtitle:
                                  '${_dashboardData['todaySales']?['count'] ?? 0} orders',
                              icon: Icons.shopping_cart_outlined,
                              color: Colors.blue,
                              onTap: () => context.push('/sales'),
                            ),
                            SummaryCard(
                              title: 'Monthly Sales',
                              value: currencyFormat.format(
                                _dashboardData['monthlySales']?['amount'] ?? 0,
                              ),
                              subtitle:
                                  '${_dashboardData['monthlySales']?['count'] ?? 0} orders',
                              icon: Icons.trending_up_outlined,
                              color: Colors.green,
                              onTap: () => context.push('/reports'),
                            ),
                            SummaryCard(
                              title: 'Total Products',
                              value: '${_dashboardData['totalProducts'] ?? 0}',
                              subtitle: '${_dashboardData['lowStockCount'] ?? 0} low stock',
                              icon: Icons.inventory_2_outlined,
                              color: Colors.orange,
                              onTap: () => context.push('/products'),
                            ),
                            SummaryCard(
                              title: 'Stock Value',
                              value: currencyFormat.format(
                                _dashboardData['stockValue'] ?? 0,
                              ),
                              subtitle: 'Total inventory value',
                              icon: Icons.account_balance_wallet_outlined,
                              color: Colors.purple,
                              onTap: () => context.push('/stock'),
                            ),
                          ],
                        ),
                        SizedBox(height: 24.h),
                        // Outstanding Balance
                        Card(
                          child: Padding(
                            padding: EdgeInsets.all(16.w),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Outstanding Balances',
                                  style: Theme.of(context).textTheme.titleMedium,
                                ),
                                SizedBox(height: 16.h),
                                Row(
                                  children: [
                                    Expanded(
                                      child: _BalanceItem(
                                        title: 'Receivables',
                                        amount: currencyFormat.format(
                                          _dashboardData['outstandingReceivables'] ?? 0,
                                        ),
                                        color: Colors.green,
                                      ),
                                    ),
                                    Expanded(
                                      child: _BalanceItem(
                                        title: 'Payables',
                                        amount: currencyFormat.format(
                                          _dashboardData['outstandingPayables'] ?? 0,
                                        ),
                                        color: Colors.red,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                        SizedBox(height: 24.h),
                        // Recent Sales
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Recent Sales',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            TextButton(
                              onPressed: () => context.push('/sales'),
                              child: const Text('View All'),
                            ),
                          ],
                        ),
                        SizedBox(height: 8.h),
                        ...(_dashboardData['recentSales'] as List? ?? [])
                            .take(5)
                            .map((sale) => RecentSaleTile(sale: sale)),
                        SizedBox(height: 24.h),
                        // Top Products
                        Text(
                          'Top Selling Products',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        SizedBox(height: 8.h),
                        ...(_dashboardData['topProducts'] as List? ?? [])
                            .take(5)
                            .map((product) => TopProductTile(product: product)),
                      ],
                    ),
                  ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/sales/create'),
        icon: const Icon(Icons.add),
        label: const Text('New Sale'),
      ),
    );
  }
}

class _BalanceItem extends StatelessWidget {
  final String title;
  final String amount;
  final Color color;

  const _BalanceItem({
    required this.title,
    required this.amount,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Colors.grey,
          ),
        ),
        SizedBox(height: 4.h),
        Text(
          amount,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            color: color,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}
