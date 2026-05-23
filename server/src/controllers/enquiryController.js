const prisma = require("../config/prisma");

/*
|--------------------------------------------------------------------------
| Create Enquiry
|--------------------------------------------------------------------------
*/
exports.createEnquiry = async (req, res) => {
  try {
    const { user_id, subject, message } = req.body;

    const enquiry = await prisma.contactEnquiry.create({
      data: {
        user_id,
        subject,
        message,
      },
    });

    res.status(201).json(enquiry);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create enquiry",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get All Enquiries
|--------------------------------------------------------------------------
*/
exports.getAllEnquiries = async (req, res) => {
  try {
    const enquiries = await prisma.contactEnquiry.findMany({
      orderBy: {
        created_at: "desc",
      },
    });

    res.json(enquiries);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch enquiries",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get Enquiry By ID
|--------------------------------------------------------------------------
*/
exports.getEnquiryById = async (req, res) => {
  try {
    const enquiry = await prisma.contactEnquiry.findUnique({
      where: {
        enquiry_id: parseInt(req.params.id),
      },
    });

    if (!enquiry) {
      return res.status(404).json({
        message: "Enquiry not found",
      });
    }

    res.json(enquiry);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch enquiry",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Respond To Enquiry
|--------------------------------------------------------------------------
*/
exports.respondToEnquiry = async (req, res) => {
  try {
    res.json({
      message: "Respond enquiry feature not implemented yet",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to respond to enquiry",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Delete Enquiry
|--------------------------------------------------------------------------
*/
exports.deleteEnquiry = async (req, res) => {
  try {
    await prisma.contactEnquiry.delete({
      where: {
        enquiry_id: parseInt(req.params.id),
      },
    });

    res.json({
      message: "Enquiry deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete enquiry",
      error: error.message,
    });
  }
};

exports.respondToEnquiry = async (req, res) => {
  try {
    const { response_message } = req.body;

    const updatedEnquiry = await prisma.contactEnquiry.update({
      where: {
        enquiry_id: parseInt(req.params.id),
      },
      data: {
        status: "RESPONDED",
        response_message,
        responded_at: new Date(),
      },
    });

    res.json(updatedEnquiry);
  } catch (error) {
    res.status(500).json({
      message: "Failed to respond to enquiry",
      error: error.message,
    });
  }
};