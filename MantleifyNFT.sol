// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title MantleifyNFT
 * @dev ERC721 contract for minting NFTs from images created with the "mantleify" overlay
 */
contract MantleifyNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    
    // Mapping from token ID to creator address
    mapping(uint256 => address) public creators;
    
    // Mapping from Grove URL to token ID (to prevent duplicate minting)
    mapping(string => uint256) public groveUrlToTokenId;
    
    // Authorized minters (your backend services)
    mapping(address => bool) public authorizedMinters;
    
    // Events
    event MantleifyNFTMinted(uint256 indexed tokenId, address indexed creator, string groveUrl, string tokenURI);
    event MinterAuthorized(address indexed minter);
    event MinterRevoked(address indexed minter);
    
    constructor() ERC721("Mantleify Collection", "MANTLE") Ownable(msg.sender) {}
    
    /**
     * @dev Authorizes an address to mint NFTs
     * @param minter Address to authorize
     */
    function authorizeMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = true;
        emit MinterAuthorized(minter);
    }
    
    /**
     * @dev Revokes minting authorization from an address
     * @param minter Address to revoke
     */
    function revokeMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = false;
        emit MinterRevoked(minter);
    }
    
    /**
     * @dev Checks if a Grove URL has already been minted
     * @param groveUrl The Grove URL to check
     * @return bool Whether the URL has been minted
     */
    function isGroveUrlMinted(string calldata groveUrl) public view returns (bool) {
        return groveUrlToTokenId[groveUrl] != 0;
    }
    
    /**
     * @dev Mints a new NFT for a mantleify image
     * @param to Address to mint the NFT to
     * @param creator Address that created the image (can be different from recipient)
     * @param groveUrl Grove URL of the image
     * @param tokenURI Metadata URI for the NFT
     * @return uint256 The new token ID
     */
    function mintNFT(
        address to,
        address creator,
        string calldata groveUrl,
        string calldata tokenURI
    ) external returns (uint256) {
        require(authorizedMinters[msg.sender] || owner() == msg.sender, "Not authorized to mint");
        require(!isGroveUrlMinted(groveUrl), "This Grove URL has already been minted");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _mint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        
        creators[newTokenId] = creator;
        groveUrlToTokenId[groveUrl] = newTokenId;
        
        emit MantleifyNFTMinted(newTokenId, creator, groveUrl, tokenURI);
        
        return newTokenId;
    }
    
    /**
     * @dev Returns the creator of a token
     * @param tokenId The token ID
     * @return address The creator's address
     */
    function getCreator(uint256 tokenId) external view returns (address) {
        require(_exists(tokenId), "Token does not exist");
        return creators[tokenId];
    }
    
    /**
     * @dev Returns the token ID for a Grove URL
     * @param groveUrl The Grove URL
     * @return uint256 The token ID (0 if not minted)
     */
    function getTokenIdByGroveUrl(string calldata groveUrl) external view returns (uint256) {
        return groveUrlToTokenId[groveUrl];
    }
    
    /**
     * @dev Checks if a token exists
     * @param tokenId The token ID to check
     * @return bool Whether the token exists
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
} 