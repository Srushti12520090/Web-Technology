<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Electricity Bill Calculator</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<style>
body{min-height:100vh;background:linear-gradient(135deg,#0d6efd,#6610f2);display:flex;align-items:center;justify-content:center}
.calculator-card{border:none;border-radius:20px;overflow:hidden}
.card-header{padding:25px}.form-control{padding:12px;border-radius:10px}
.calculate-btn{padding:12px;border-radius:10px;font-weight:600}
.slab-box{background:#f8f9fa;border-radius:12px;padding:15px}
.slab-box p{margin-bottom:6px}
</style>
</head>
<body>
<div class="container">
<div class="row justify-content-center">
<div class="col-md-8 col-lg-6">
<div class="card calculator-card shadow-lg">
<div class="card-header bg-dark text-white text-center">
<h2>⚡ Electricity Bill Calculator</h2>
<p class="mb-0">Calculate your electricity bill instantly</p>
</div>
<div class="card-body p-4">
<% if (request.getAttribute("error") != null) { %>
<div class="alert alert-danger"><%= request.getAttribute("error") %></div>
<% } %>

<div class="slab-box mb-4">
<h5 class="mb-3">Electricity Rate Slabs</h5>
<p><strong>0 - 50 units:</strong> ₹3.50 / unit</p>
<p><strong>51 - 150 units:</strong> ₹4.00 / unit</p>
<p><strong>151 - 250 units:</strong> ₹5.20 / unit</p>
<p><strong>Above 250 units:</strong> ₹6.50 / unit</p>
</div>

<form id="billForm" action="calculateBill" method="post">
<div class="mb-3">
<label for="name" class="form-label">Consumer Name</label>
<input type="text" id="name" name="name" class="form-control"
placeholder="Enter your name" required>
</div>
<div class="mb-4">
<label for="units" class="form-label">Units Consumed</label>
<input type="number" id="units" name="units" class="form-control"
placeholder="Enter electricity units" min="0" step="0.01" required>
</div>
<button type="submit" class="btn btn-primary w-100 calculate-btn">
Calculate Electricity Bill
</button>
</form>
</div>
</div>
</div>
</div>
</div>

<script>
$(document).ready(function () {
    $("#billForm").submit(function (event) {
        let name = $("#name").val().trim();
        let units = $("#units").val();

        if (name === "") {
            alert("Please enter consumer name.");
            event.preventDefault();
            return;
        }

        if (units === "" || Number(units) < 0) {
            alert("Please enter valid electricity units.");
            event.preventDefault();
        }
    });
});
</script>
</body>
</html>
