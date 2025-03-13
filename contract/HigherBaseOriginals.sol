// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract HigherBaseOriginals is ERC721Enumerable, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    enum OverlayType { HIGHER, BASE, DICKBUTTIFY }

    mapping(uint256 => address) public creators;
    mapping(uint256 => OverlayType) public overlayTypes;
    mapping(string => uint256) public groveUrlToTokenId;

    uint256 public constant MAX_ORIGINALS = 100;
    uint256 public constant ORIGINAL_PRICE = 0.05 ether;

    event OriginalNFTMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string groveUrl,
        string metadataURI,
        OverlayType overlayType
    );

    constructor() ERC721("Higher Base Originals", "HBO") Ownable(msg.sender) {}

    function mintOriginalNFT(
        address to,
        address creator,
        string calldata groveUrl,
        string calldata metadataURI, // Renamed to avoid shadowing
        OverlayType overlayType
    ) external payable returns (uint256) {
        require(_tokenIds.current() < MAX_ORIGINALS, "Max originals minted");
        require(msg.value >= ORIGINAL_PRICE, "Insufficient payment");
        require(groveUrlToTokenId[groveUrl] == 0, "Grove URL already used");

        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _mint(to, newTokenId);
        _setTokenURI(newTokenId, metadataURI);

        creators[newTokenId] = creator;
        overlayTypes[newTokenId] = overlayType;
        groveUrlToTokenId[groveUrl] = newTokenId;

        emit OriginalNFTMinted(newTokenId, creator, groveUrl, metadataURI, overlayType);

        return newTokenId;
    }

    // Override functions to resolve conflicts between ERC721URIStorage and ERC721Enumerable
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

   function tokenURI(uint256 tokenId) 
    public 
    view 
    override(ERC721, ERC721URIStorage) 
    returns (string memory) 
{
    return super.tokenURI(tokenId);
}

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}
