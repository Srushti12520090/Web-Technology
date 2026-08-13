<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Electricity Bill Calculator</title>

    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">

    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>

    <link rel="stylesheet" href="style.css">
</head>

<body>

<div class="container">
    <div class="row justify-content-center mt-5">

        <div class="col-md-7 col-lg-6">

            <div class="card shadow-lg border-0">

                <div class="card-header text-center bg-primary text-white">
                    <h2>Electricity Bill Calculator</h2>
                </div>

                <div class="card-body p-4">

                    <form method="POST" id="billForm">

                        <div class="mb-3">
                            <label for="name" class="form-label">
                                Consumer Name
                            </label>

                            <input type="text"
                                   class="form-control"
                                   id="name"
                                   name="name"
                                   placeholder="Enter your name"
                                   required>
                        </div>

                        <div class="mb-3">
                            <label for="units" class="form-label">
                                Electricity Units Consumed
                            </label>

                            <input type="number"
                                   class="form-control"
                                   id="units"
                                   name="units"
                                   placeholder="Enter units consumed"
                                   min="0"
                                   required>
                        </div>

                        <button type="submit"
                                name="calculate"
                                class="btn btn-primary w-100">
                            Calculate Bill
                        </button>

                    </form>

                    <?php

                    if (isset($_POST['calculate'])) {

                        $name = htmlspecialchars($_POST['name']);
                        $units = floatval($_POST['units']);

                        $bill = 0;

                        if ($units <= 50) {

                            $bill = $units * 3.50;

                        }
                        elseif ($units <= 150) {

                            $bill = (50 * 3.50) +
                                    (($units - 50) * 4.00);

                        }
                        elseif ($units <= 250) {

                            $bill = (50 * 3.50) +
                                    (100 * 4.00) +
                                    (($units - 150) * 5.20);

                        }
                        else {

                            $bill = (50 * 3.50) +
                                    (100 * 4.00) +
                                    (100 * 5.20) +
                                    (($units - 250) * 6.50);
                        }

                    ?>

                    <div class="alert alert-success mt-4">

                        <h4 class="text-center">
                            Electricity Bill
                        </h4>

                        <hr>

                        <p>
                            <strong>Consumer Name:</strong>
                            <?php echo $name; ?>
                        </p>

                        <p>
                            <strong>Units Consumed:</strong>
                            <?php echo $units; ?>
                        </p>

                        <p class="fs-4">
                            <strong>Total Bill:</strong>
                            ₹<?php echo number_format($bill, 2); ?>
                        </p>

                    </div>

                    <?php } ?>

                </div>
            </div>

        </div>
    </div>
</div>

<!-- jQuery Validation -->
<script>
$(document).ready(function() {

    $("#billForm").submit(function(event) {

        let units = $("#units").val();

        if (units === "" || units < 0) {
            alert("Please enter a valid number of units.");
            event.preventDefault();
        }

    });

});
</script>

</body>
</html>