# Asphalt
So trucking rate is the cost of trucking (current rate is $128) per hour. So we put in how many minutes a round trip from the site to the nearest asphalt pit is to get our trucking rate. Then
material rates are given to us by the pits, crew hours is effectively a combined list of the hourly costs of the crew members and equipment needed on that site, so right now our total hourly rate
 for Labour and Equipment in our template is sitting at $1098.50. I think it may be wise to separate these out while we have the change, so we have labor cost and eqipment cost, which in the
future can be automatically taken from our system data on crew cost, but for now we should grab defaults from a library, and allow the estimator to change it. For a bit more detail, the labour
table is about 10 guys (from Foreman to Operator to Labourer), ranging from $75 an hour to 36 an hour, with a quanity besides their rate, so your could bump up the $48.5 operator from 1 operator
to 2 for that job. Then it is all totalled to give a per hour rate. Hours are calculated through a "Tonnes per hour" cell, which allows us to control our estimated production. Rental is also a
similar system, per hour rates which can be manually adjusted via a "table" in the excel. For the conversion, we put in the area (s.m.), the depth, then we have the formula (area * depth *
0.00245) which may be a valid paramter for this calculator.
