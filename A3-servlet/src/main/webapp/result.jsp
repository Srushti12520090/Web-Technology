<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Electricity Bill Result</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<style>
body{min-height:100vh;background:linear-gradient(135deg,#198754,#0d6efd);display:flex;align-items:center;justify-content:center}
.result-card{border:none;border-radius:20px;overflow:hidden}
.bill-amount{font-size:42px;font-weight:700;color:#198754}
.bill-row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #dee2e6}
</style>
</head>
<body>
<div class="container">
<div class="row justify-content-center">
<div class="col-md-7 col-lg-6">
<div class="card result-card shadow-lg">
<div class="card-header bg-dark text-white text-center p-4">
<h2>⚡ Electricity Bill</h2>
<p class="mb-0">Bill Calculation Result</p>
</div>
<div class="card-body p-4">

<div class="bill-row">
<span>Consumer Name</span>
<strong><%= request.getAttribute("name") %></strong>
</div>

<div class="bill-row">
<span>Units Consumed</span>
<strong><%= request.getAttribute("units") %></strong>
</div>

<div class="text-center mt-4">
<p class="text-muted mb-1">Total Electricity Bill</p>
<div class="bill-amount">
₹<%= String.format("%.2f", (Double)request.getAttribute("bill")) %>
</div>
</div>

<div class="alert alert-info mt-4">
<strong>Calculation:</strong>
<p class="mb-0 mt-2">The bill is calculated using the applicable electricity consumption slabs.</p>
</div>

<a href="index.jsp" class="btn btn-primary w-100 mt-2">
Calculate Another Bill
</a>
</div>
</div>
</div>
</div>
</div>
</body>
</html>
