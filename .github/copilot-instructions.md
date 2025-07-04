<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Electricity Plan Comparator

This is a React + TypeScript + Vite application for comparing electricity plans (constant rate vs peak/off-peak) based on daily usage patterns.

## Project Structure
- Uses React with TypeScript for type safety
- Vite as the build tool for fast development
- Tailwind CSS for styling
- Chart.js for data visualization
- Modern, responsive design

## Key Features to Implement
1. **Usage Pattern Input**: Allow users to input hourly electricity usage (24-hour format)
2. **Plan Configuration**: Set up different electricity plans (constant rate vs time-of-use)
3. **Cost Calculation**: Calculate and compare costs between different plans
4. **Data Visualization**: Display usage patterns and cost comparisons using charts
5. **Responsive Design**: Ensure the app works well on all device sizes

## Technical Guidelines
- Use functional components with hooks
- Implement proper TypeScript interfaces for all data structures
- Follow React best practices for state management
- Use Tailwind CSS classes for styling
- Implement proper error handling and validation
- Create reusable components where appropriate

## Data Models
- Usage patterns (hourly consumption data)
- Electricity plans (rates, peak/off-peak times)
- Cost calculations and comparisons
