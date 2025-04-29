import React, { useState } from 'react';

const TrueEMDCalculator = () => {
  // Initial data
  const initialProjections = {
    "David": {LPC: 178, CPC: 138, NDP: 5, Green: 1, BQ: 21, PPC: 0},
    "Caleb": {LPC: 158, CPC: 157, NDP: 6, Green: 2, BQ: 20, PPC: 0},
    "Xiyuan": {LPC: 180, CPC: 132, NDP: 10, Green: 1, BQ: 20, PPC: 0},
    "Sara": {LPC: 152, CPC: 154, NDP: 8, Green: 1, BQ: 28, PPC: 0},
    "Ces": {LPC: 165, CPC: 145, NDP: 7, Green: 1, BQ: 25, PPC: 0},
    "Gaurav": {LPC: 185, CPC: 134, NDP: 6, Green: 1, BQ: 17, PPC: 0}
  };

  const lastElection = {LPC: 160, CPC: 119, NDP: 25, Green: 2, BQ: 32, PPC: 0};

  // Party coordinates from the political compass
  const partyCoordinates = {
    "NDP": { x: 1.75, y: 8.95 },
    "LPC": { x: 4.66, y: 6.64 },
    "GPC": { x: 1.40, y: 8.77 },
    "BQ": { x: 3.34, y: 5.60 },
    "PPC": { x: 9.76, y: 0.92 },
    "CPC": { x: 6.24, y: 2.23 }
  };

  // Party name mapping
  const partyMapping = {
    "LPC": "LPC",
    "CPC": "CPC",
    "NDP": "NDP",
    "Green": "GPC",
    "BQ": "BQ",
    "PPC": "PPC"
  };

  // Calculate the distance matrix between parties
  const calculateDistanceMatrix = () => {
    const matrix = {};

    for (const party1 in partyCoordinates) {
      matrix[party1] = {};

      for (const party2 in partyCoordinates) {
        const coords1 = partyCoordinates[party1];
        const coords2 = partyCoordinates[party2];

        // Calculate Euclidean distance
        const dx = coords1.x - coords2.x;
        const dy = coords1.y - coords2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        matrix[party1][party2] = parseFloat(distance.toFixed(2));
      }
    }

    return matrix;
  };

  const distanceMatrix = calculateDistanceMatrix();

  // Initialize state
  const [actualResults, setActualResults] = useState({
    LPC: 160, CPC: 119, NDP: 25, Green: 2, BQ: 32, PPC: 0
  });
  const [standardResults, setStandardResults] = useState(null);
  const [trueEMDResults, setTrueEMDResults] = useState(null);
  const [bestPredictor, setBestPredictor] = useState(null);
  const [bestTrueEMDPredictor, setBestTrueEMDPredictor] = useState(null);
  const [showLastYear, setShowLastYear] = useState(true);
  const [showPairwiseEMD, setShowPairwiseEMD] = useState(false);
  const [pairwiseResults, setPairwiseResults] = useState(null);
  const [consensusPredictor, setConsensusPredictor] = useState(null);
  const [calculationDetails, setCalculationDetails] = useState(null);
  const [selectedPredictor, setSelectedPredictor] = useState(null);
  const [balanceSeats, setBalanceSeats] = useState(true);

  // Parties constants
  const parties = ["LPC", "CPC", "NDP", "Green", "BQ", "PPC"];

  // Function to calculate standard Earth Mover's Distance (EMD)
  function calculateStandardEMD(prediction, actual) {
    let distance = 0;

    for (const party of parties) {
      distance += Math.abs(prediction[party] - actual[party]);
    }

    return distance;
  }

  // Function to calculate true Earth Mover's Distance (EMD)
  function calculateTrueEMD(prediction, actual, showDetails = false) {
    // Standardize the prediction and actual results
    const standardizedPrediction = {};
    const standardizedActual = {};

    for (const party in prediction) {
      const standardParty = partyMapping[party];
      if (standardParty) {
        standardizedPrediction[standardParty] = prediction[party];
        standardizedActual[standardParty] = actual[party];
      }
    }

    // Calculate excess (source) and deficit (destination) for each party
    const excess = {};
    const deficit = {};

    for (const party in standardizedPrediction) {
      const diff = standardizedPrediction[party] - standardizedActual[party];

      if (diff > 0) {
        excess[party] = diff;
      } else if (diff < 0) {
        deficit[party] = -diff;
      }
    }

    // Calculate total excess and deficit
    const totalExcess = Object.values(excess).reduce((sum, val) => sum + val, 0);
    const totalDeficit = Object.values(deficit).reduce((sum, val) => sum + val, 0);

    // Balance excess and deficit if needed
    let balanceParty = null;
    let balanceAmount = 0;

    if (totalExcess !== totalDeficit && balanceSeats) {
      if (totalExcess > totalDeficit) {
        // Add deficit to "BALANCE" party
        balanceAmount = totalExcess - totalDeficit;
        deficit["BALANCE"] = balanceAmount;
      } else {
        // Add excess to "BALANCE" party
        balanceAmount = totalDeficit - totalExcess;
        excess["BALANCE"] = balanceAmount;
      }
      balanceParty = totalExcess > totalDeficit ? "deficit" : "excess";
    }

    // If there's no movement needed, return 0
    if (Object.keys(excess).length === 0 || Object.keys(deficit).length === 0) {
      return { emd: 0, details: null };
    }

    // Create a list of all possible movements (source, destination, distance)
    const possibleMovements = [];

    for (const sourceParty in excess) {
      for (const destParty in deficit) {
        // For BALANCE party, use a very high distance to ensure it's used last
        let distance;
        if (sourceParty === "BALANCE" || destParty === "BALANCE") {
          distance = 100; // Very high distance penalty
        } else {
          distance = distanceMatrix[sourceParty][destParty];
        }

        possibleMovements.push({
          source: sourceParty,
          destination: destParty,
          distance: distance
        });
      }
    }

    // Sort movements by distance (ascending)
    possibleMovements.sort((a, b) => a.distance - b.distance);

    // Greedy allocation - start with the shortest distances
    const allocation = {};
    let totalCost = 0;
    const moveDetails = [];

    // Make a copy of excess and deficit to modify during allocation
    const remainingExcess = {...excess};
    const remainingDeficit = {...deficit};

    for (const movement of possibleMovements) {
      const { source, destination, distance } = movement;

      // Skip if either source or destination is exhausted
      if (remainingExcess[source] <= 0 || remainingDeficit[destination] <= 0) {
        continue;
      }

      // Allocate the minimum of available excess and deficit
      const allocated = Math.min(remainingExcess[source], remainingDeficit[destination]);

      if (!allocation[source]) {
        allocation[source] = {};
      }

      allocation[source][destination] = allocated;
      const moveCost = allocated * distance;
      totalCost += moveCost;

      moveDetails.push({
        from: source,
        to: destination,
        seats: allocated,
        distance: distance,
        cost: moveCost
      });

      // Update remaining excess and deficit
      remainingExcess[source] -= allocated;
      remainingDeficit[destination] -= allocated;
    }

    const details = {
      excess,
      deficit,
      totalExcess,
      totalDeficit,
      allocation,
      moves: moveDetails,
      balanceParty,
      balanceAmount
    };

    return {
      emd: parseFloat(totalCost.toFixed(2)),
      details: showDetails ? details : null
    };
  }

  // Function to handle input changes
  const handleInputChange = (party, value) => {
    const parsedValue = parseInt(value) || 0;
    setActualResults(prev => ({
      ...prev,
      [party]: parsedValue
    }));
  };

  // Function to calculate results
  const calculateResults = () => {
    const standard = {};
    const trueEMD = {};
    let lowestStandard = Infinity;
    let lowestTrueEMD = Infinity;
    let bestStandard = null;
    let bestTrue = null;

    for (const predictor in initialProjections) {
      standard[predictor] = calculateStandardEMD(initialProjections[predictor], actualResults);
      const { emd } = calculateTrueEMD(initialProjections[predictor], actualResults);
      trueEMD[predictor] = emd;

      if (standard[predictor] < lowestStandard) {
        lowestStandard = standard[predictor];
        bestStandard = predictor;
      }

      if (trueEMD[predictor] < lowestTrueEMD) {
        lowestTrueEMD = trueEMD[predictor];
        bestTrue = predictor;
      }
    }

    setStandardResults(standard);
    setTrueEMDResults(trueEMD);
    setBestPredictor(bestStandard);
    setBestTrueEMDPredictor(bestTrue);
  };

  // Function to show calculation details for a predictor
  const showDetails = (predictor) => {
    const { details } = calculateTrueEMD(initialProjections[predictor], actualResults, true);
    setCalculationDetails(details);
    setSelectedPredictor(predictor);
  };

  // Function to calculate pairwise EMD between predictors
  const calculatePairwiseEMD = () => {
    const predictorNames = Object.keys(initialProjections);
    const pairwiseEMDs = {};
    const avgEMDs = {};

    // Calculate EMD between all pairs
    for (let i = 0; i < predictorNames.length; i++) {
      const predictor1 = predictorNames[i];
      pairwiseEMDs[predictor1] = {};
      let sum = 0;
      let count = 0;

      for (let j = 0; j < predictorNames.length; j++) {
        const predictor2 = predictorNames[j];

        if (predictor1 === predictor2) {
          pairwiseEMDs[predictor1][predictor2] = 0; // Distance to self is 0
        } else {
          const { emd } = calculateTrueEMD(initialProjections[predictor1], initialProjections[predictor2]);
          pairwiseEMDs[predictor1][predictor2] = emd;
          sum += emd;
          count++;
        }
      }

      // Calculate average EMD for this predictor
      avgEMDs[predictor1] = sum / count;
    }

    // Find consensus predictor (lowest average EMD)
    let lowestAvgEMD = Infinity;
    let consensus = null;

    for (const predictor in avgEMDs) {
      if (avgEMDs[predictor] < lowestAvgEMD) {
        lowestAvgEMD = avgEMDs[predictor];
        consensus = predictor;
      }
    }

    setPairwiseResults({ pairwiseEMDs, avgEMDs });
    setConsensusPredictor(consensus);
    setShowPairwiseEMD(true);
  };

  // Function to load last year's results
  const loadLastYear = () => {
    setActualResults(lastElection);
  };

  // Function to clear results
  const clearResults = () => {
    setActualResults({LPC: 0, CPC: 0, NDP: 0, Green: 0, BQ: 0, PPC: 0});
    setStandardResults(null);
    setTrueEMDResults(null);
    setBestPredictor(null);
    setBestTrueEMDPredictor(null);
    setShowPairwiseEMD(false);
    setCalculationDetails(null);
    setSelectedPredictor(null);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">True Earth Mover's Distance Calculator</h1>

      <div className="mb-4 bg-blue-50 p-4 rounded border border-blue-200">
        <h2 className="text-lg font-semibold mb-2">About Earth Mover's Distance (EMD)</h2>
        <p className="text-sm mb-2">
          This calculator uses two different EMD calculations:
        </p>
        <ul className="text-sm list-disc list-inside mb-2">
          <li><strong>Standard EMD:</strong> Simply the sum of absolute differences in seat counts for each party</li>
          <li><strong>True EMD:</strong> Takes into account the ideological distance between parties in the political space. Considers the optimal way to "move" seats from over-predicted parties to under-predicted parties, with a cost proportional to their ideological distance.</li>
        </ul>
        <p className="text-sm">
          The True EMD better reflects the reality that errors between ideologically similar parties (like NDP and Green) are less significant than errors between distant parties (like NDP and PPC).
        </p>
      </div>

      {/* Projections Table */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Seat Projections</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2">Party</th>
                {Object.keys(initialProjections).map(predictor => (
                  <th key={predictor} className="border border-gray-300 p-2">{predictor}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parties.map(party => (
                <tr key={party}>
                  <th className="border border-gray-300 p-2 bg-gray-50">{party}</th>
                  {Object.keys(initialProjections).map(predictor => (
                    <td key={`${predictor}-${party}`} className="border border-gray-300 p-2 text-center">
                      {initialProjections[predictor][party]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Political Compass Visualization */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Party Positions on Political Compass</h3>
          <div className="relative h-80 w-full border border-gray-300 bg-gray-50 mb-2">
            {/* X and Y axes */}
            <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-400"></div>
            <div className="absolute bottom-0 top-0 left-1/2 w-px bg-gray-400"></div>

            {/* Axis labels */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 text-xs">Progressive</div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-4 text-xs">Conservative</div>
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 text-xs rotate-90">Left</div>
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4 text-xs -rotate-90">Right</div>

            {/* Party positions */}
            {Object.entries(partyCoordinates).map(([party, coords]) => {
              // Convert coordinates to position in the div (0-10 scale to 0-100%)
              const x = (coords.x / 10) * 100;
              const y = 100 - ((coords.y / 10) * 100); // Invert Y axis

              // Determine party color
              let color;
              switch(party) {
                case 'LPC': color = 'bg-red-600'; break;
                case 'CPC': color = 'bg-blue-800'; break;
                case 'NDP': color = 'bg-orange-500'; break;
                case 'GPC': color = 'bg-green-600'; break;
                case 'BQ': color = 'bg-blue-400'; break;
                case 'PPC': color = 'bg-purple-800'; break;
                default: color = 'bg-gray-500';
              }

              return (
                <div
                  key={party}
                  className={`absolute w-4 h-4 ${color} rounded-full transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-xs text-white font-bold`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  title={`${party}: Economic=${coords.x}, Social=${coords.y}`}
                >
                  {party.charAt(0)}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pairwise Comparison Button */}
        <div className="mt-4">
          <button
            onClick={calculatePairwiseEMD}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            Compare Predictions
          </button>
        </div>
      </div>

      {/* Pairwise EMD Results */}
      {showPairwiseEMD && pairwiseResults && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Pairwise True EMD Comparison</h2>
          <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2">Predictor</th>
                  {Object.keys(initialProjections).map(predictor => (
                    <th key={predictor} className="border border-gray-300 p-2">{predictor}</th>
                  ))}
                  <th className="border border-gray-300 p-2 bg-yellow-50">Avg. EMD</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(pairwiseResults.pairwiseEMDs).map(predictor1 => (
                  <tr key={predictor1} className={predictor1 === consensusPredictor ? "bg-green-50" : ""}>
                    <th className="border border-gray-300 p-2 bg-gray-50">{predictor1}</th>
                    {Object.keys(pairwiseResults.pairwiseEMDs[predictor1]).map(predictor2 => (
                      <td
                        key={`${predictor1}-${predictor2}`}
                        className="border border-gray-300 p-2 text-center"
                      >
                        {pairwiseResults.pairwiseEMDs[predictor1][predictor2]}
                      </td>
                    ))}
                    <td className="border border-gray-300 p-2 text-center font-medium bg-yellow-50">
                      {pairwiseResults.avgEMDs[predictor1].toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {consensusPredictor && (
            <div className="bg-green-50 p-4 rounded border border-green-300 mb-4">
              <p className="text-lg font-medium">
                The predictor closest to consensus is <span className="font-bold">{consensusPredictor}</span> with an average True EMD of {pairwiseResults.avgEMDs[consensusPredictor].toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                (Lower average EMD means the prediction is more similar to all other predictions, accounting for ideological distance)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Seat Balance Option */}
      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={balanceSeats}
            onChange={() => setBalanceSeats(!balanceSeats)}
            className="mr-2"
          />
          <span className="text-sm">Balance seat totals (handle differences between total predicted and actual seats)</span>
        </label>
      </div>

      {/* Actual Results Input */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Actual Election Results</h2>
        <div className="flex flex-wrap gap-4 mb-4">
          {parties.map(party => (
            <div key={party} className="flex items-center">
              <label className="mr-2 font-medium">{party}:</label>
              <input
                type="number"
                value={actualResults[party]}
                onChange={(e) => handleInputChange(party, e.target.value)}
                className="border border-gray-300 p-2 w-20 rounded"
                min="0"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-4">
          <button
            onClick={calculateResults}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Calculate EMD
          </button>
          {showLastYear && (
            <button
              onClick={loadLastYear}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Load Last Election
            </button>
          )}
          <button
            onClick={clearResults}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Results Display */}
      {standardResults && trueEMDResults && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Results vs. Actual</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Standard EMD Results */}
            <div className="bg-gray-50 p-4 rounded border border-gray-300">
              <h3 className="text-lg font-medium mb-2">Standard EMD:</h3>
              <ul className="mb-4">
                {Object.keys(standardResults).map(predictor => (
                  <li key={predictor} className={predictor === bestPredictor ? "font-bold text-green-600" : ""}>
                    {predictor}: {standardResults[predictor]}
                    {predictor === bestPredictor && " (Best Predictor)"}
                  </li>
                ))}
              </ul>
              {bestPredictor && (
                <p className="text-md font-semibold">
                  Winner (Standard): <span className="text-green-600">{bestPredictor}</span> with EMD of {standardResults[bestPredictor]}
                </p>
              )}
            </div>

            {/* True EMD Results */}
            <div className="bg-blue-50 p-4 rounded border border-blue-300">
              <h3 className="text-lg font-medium mb-2">True EMD (Ideological Distance):</h3>
              <ul className="mb-4">
                {Object.keys(trueEMDResults).map(predictor => (
                  <li
                    key={predictor}
                    className={`${predictor === bestTrueEMDPredictor ? "font-bold text-blue-600" : ""} cursor-pointer hover:underline`}
                    onClick={() => showDetails(predictor)}
                  >
                    {predictor}: {trueEMDResults[predictor]}
                    {predictor === bestTrueEMDPredictor && " (Best Predictor)"}
                  </li>
                ))}
              </ul>
              {bestTrueEMDPredictor && (
                <p className="text-md font-semibold">
                  Winner (True EMD): <span className="text-blue-600">{bestTrueEMDPredictor}</span> with EMD of {trueEMDResults[bestTrueEMDPredictor]}
                </p>
              )}
              <p className="text-xs text-gray-600 mt-2">
                Click on a predictor to see calculation details.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Calculation Details */}
      {calculationDetails && selectedPredictor && (
        <div className="mb-6 bg-gray-50 p-4 rounded border border-gray-300">
          <h2 className="text-xl font-semibold mb-2">True EMD Calculation for {selectedPredictor}</h2>

          {/* Seat Balance Information */}
          {calculationDetails.balanceParty && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded">
              <p className="text-sm">
                <strong>Note:</strong> The total number of {calculationDetails.balanceParty === "excess" ? "predicted" : "actual"} seats is {calculationDetails.balanceAmount} higher than the total {calculationDetails.balanceParty === "excess" ? "actual" : "predicted"} seats.
                A "BALANCE" category was added to account for this difference.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Excess Seats */}
            <div>
              <h3 className="text-md font-medium mb-2">Overpredicted Parties:</h3>
              <ul className="list-disc list-inside">
                {Object.entries(calculationDetails.excess).map(([party, seats]) => (
                  <li key={party}>
                    <span className={party === "BALANCE" ? "italic text-gray-500" : ""}>
                      {party === "BALANCE" ? "Balance adjustment" : party}: +{seats} seats
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-sm mt-2">Total excess: {calculationDetails.totalExcess} seats</p>
            </div>

            {/* Deficit Seats */}
            <div>
              <h3 className="text-md font-medium mb-2">Underpredicted Parties:</h3>
              <ul className="list-disc list-inside">
                {Object.entries(calculationDetails.deficit).map(([party, seats]) => (
                  <li key={party}>
                    <span className={party === "BALANCE" ? "italic text-gray-500" : ""}>
                      {party === "BALANCE" ? "Balance adjustment" : party}: -{seats} seats
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-sm mt-2">Total deficit: {calculationDetails.totalDeficit} seats</p>
            </div>
          </div>

          {/* Seat Movements */}
          <div>
            <h3 className="text-md font-medium mb-2">Optimal Seat Movements:</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2">From Party</th>
                    <th className="border border-gray-300 p-2">To Party</th>
                    <th className="border border-gray-300 p-2">Seats Moved</th>
                    <th className="border border-gray-300 p-2">Ideological Distance</th>
                    <th className="border border-gray-300 p-2">Movement Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {calculationDetails.moves.map((move, index) => (
                    <tr key={index} className={move.from === "BALANCE" || move.to === "BALANCE" ? "text-gray-500 italic" : ""}>
                      <td className="border border-gray-300 p-2">{move.from}</td>
                      <td className="border border-gray-300 p-2">{move.to}</td>
                      <td className="border border-gray-300 p-2 text-center">{move.seats}</td>
                      <td className="border border-gray-300 p-2 text-center">{move.distance.toFixed(2)}</td>
                      <td className="border border-gray-300 p-2 text-center">{move.cost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-medium">
                    <td colSpan="4" className="border border-gray-300 p-2 text-right">Total EMD:</td>
                    <td className="border border-gray-300 p-2 text-center">{trueEMDResults[selectedPredictor]}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="text-sm mt-2">
              The True EMD finds the optimal way to move overpredicted seats to underpredicted parties,
              with the cost weighted by the ideological distance between parties.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrueEMDCalculator;
