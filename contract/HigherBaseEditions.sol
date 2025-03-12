// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface IHigherBaseOriginals {
    function getCreator(uint256 tokenId) external view returns (address);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}

contract HigherBaseEditions is ERC1155, Ownable {
    using Strings for uint256;

    IHigherBaseOriginals public originalsContract;
    mapping(uint256 => uint256) public editionCounts;

    uint256 public constant MAX_EDITIONS_PER_ORIGINAL = 100;
    uint256 public constant EDITION_PRICE = 0.01 ether;

    event EditionNFTMinted(
        uint256 indexed originalId,
        uint256 indexed editionNumber,
        address indexed buyer
    );

    constructor(address _originalsContract) ERC1155("") Ownable(msg.sender) {
        originalsContract = IHigherBaseOriginals(_originalsContract);
    }

    function mintEdition(uint256 originalId) external payable returns (uint256) {
        require(originalsContract.getCreator(originalId) != address(0), "Original not found");
        require(editionCounts[originalId] < MAX_EDITIONS_PER_ORIGINAL, "Max editions minted");
        require(msg.value >= EDITION_PRICE, "Insufficient payment");

        uint256 editionNumber = editionCounts[originalId] + 1;
        editionCounts[originalId] = editionNumber;
        uint256 editionId = (originalId * 10000) + editionNumber;

        _mint(msg.sender, editionId, 1, "");

        emit EditionNFTMinted(originalId, editionNumber, msg.sender);
        return editionNumber;
    }

    function uri(uint256 editionId) public view override returns (string memory) {
        uint256 originalId = editionId / 10000;
        require(originalsContract.getCreator(originalId) != address(0), "Original not found");

        string memory originalURI = originalsContract.tokenURI(originalId);
        return string(abi.encodePacked(originalURI, "#edition=", (editionId % 10000).toString()));
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}
