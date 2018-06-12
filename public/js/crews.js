$(document).ready(function () {
  $('.employeeDropdown').dropdown({
    hover: false,
    closeOnClick: false,
    coverTrigger: false
  });
  $('.newCrewMember').click(function () {
    var crewId = $(this).siblings('.id').val();
    var employeeId = $(this).val();
    if ($(this).is(':checked')) {
      $.ajax({
        type: 'POST',
        url: `/crew/${crewId}/employee/${employeeId}`,
        timeout: 5000,
        success: function () {
          location.reload(true);
        }
      });
    } else {
      $.ajax({
        type: 'DELETE',
        url: `/crew/${crewId}/employee/${employeeId}`,
        timeout: 5000,
        success: function () {
          location.reload(true);
        }
      });
    }
  });
  $('.vehicleDropdown').dropdown({
    hover: false,
    closeOnClick: false,
    coverTrigger: false
  });
  $('.newCrewVehicle').click(function () {
    var crewId = $(this).siblings('.id').val();
    var vehicleId = $(this).val();
    if ($(this).is(':checked')) {
      $.ajax({
        type: 'POST',
        url: `/crew/${crewId}/vehicle/${vehicleId}`,
        success: function() {
          location.reload(true);
        }
      });
    } else {
      $.ajax({
        type: 'DELETE',
        url: `/crew/${crewId}/vehicle/${vehicleId}`,
        success: function() {
          location.reload(true);
        }
      });
    }
  });
});

function deleteRequest(id) {
  $.ajax({
    type: 'DELETE',
    url: `/crew/${id}`,
    success: function() {
      location.reload(true);
    } 
  });
};
function loadForm() {
  var template = $('#crew-form-template').html();
  $("#crew-form-div").append(template);
  $('#add-crew').remove();
};